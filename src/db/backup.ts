// 전체 IndexedDB 데이터의 JSON 백업/복원. db.tables를 그대로 순회하므로 새 테이블(예: 향후 Career
// 기능)이 추가돼도 이 파일을 고칠 필요가 없다 — 특정 테이블 이름을 하드코딩하지 않는다.
import { db } from "@/db/db";

export const BACKUP_FILE_PREFIX = "tipotyping-backup";

export interface BackupFile {
  /** 백업 당시 Dexie 스키마 버전(db.verno). 복원 시 현재 버전과 다르면 거부한다. */
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

/** 오늘 날짜로 "tipotyping-backup-YYYY-MM-DD.json" 형식의 파일명을 만든다. */
export function backupFileName(date: Date = new Date()): string {
  return `${BACKUP_FILE_PREFIX}-${date.toISOString().slice(0, 10)}.json`;
}

/** 현재 IndexedDB의 모든 테이블을 하나의 JSON 직렬화 가능한 객체로 내보낸다. */
export async function createBackup(): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {};
  await db.transaction("r", db.tables, async () => {
    for (const table of db.tables) {
      tables[table.name] = await table.toArray();
    }
  });
  return {
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

/** 백업 파일 텍스트를 파싱하고 기본 구조를 검증한다. 문제가 있으면 사람이 읽을 수 있는 메시지로 던진다. */
export function parseBackupFile(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("JSON 형식이 아닙니다.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("올바른 백업 파일 형식이 아닙니다.");
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.schemaVersion !== "number") {
    throw new Error("schemaVersion이 없거나 올바르지 않습니다.");
  }
  if (typeof obj.exportedAt !== "string") {
    throw new Error("exportedAt이 없거나 올바르지 않습니다.");
  }
  if (!obj.tables || typeof obj.tables !== "object" || Array.isArray(obj.tables)) {
    throw new Error("tables 데이터가 없습니다.");
  }
  for (const [name, rows] of Object.entries(obj.tables as Record<string, unknown>)) {
    if (!Array.isArray(rows)) {
      throw new Error(`"${name}" 테이블 데이터가 배열이 아닙니다.`);
    }
  }
  return obj as unknown as BackupFile;
}

/**
 * 백업이 현재 앱(DB 스키마)과 호환되는지 검증한다. 문제가 있으면 던진다(DB는 건드리지 않는다).
 * - schemaVersion이 현재와 다르면 거부한다. 버전마다 마이그레이션(예: v6 answer-input 복수정답
 *   분리, v7 빈 Session 정리)이 데이터 형태를 바꿔왔기 때문에, 다른 버전의 백업을 그대로 테이블에
 *   밀어넣으면 마이그레이션이 적용되지 않은 옛 포맷 데이터가 섞여 들어갈 수 있다.
 * - 백업에 담긴 테이블 구성이 현재 앱의 테이블 구성과 완전히 같아야 한다.
 */
export function validateBackupForRestore(backup: BackupFile): void {
  if (backup.schemaVersion !== db.verno) {
    throw new Error(
      `백업 파일의 버전(${backup.schemaVersion})이 현재 앱 버전(${db.verno})과 달라 복원할 수 없습니다.`,
    );
  }
  const currentTableNames = new Set(db.tables.map((t) => t.name));
  const backupTableNames = new Set(Object.keys(backup.tables));
  const missing = [...currentTableNames].filter((n) => !backupTableNames.has(n));
  const extra = [...backupTableNames].filter((n) => !currentTableNames.has(n));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error("백업 파일의 테이블 구성이 현재 앱과 다릅니다.");
  }
}

/**
 * 전체 데이터를 백업 시점 상태로 되돌린다.
 * 트랜잭션 안에서 모든 테이블을 비우고 다시 채우므로, 중간에 실패하면(예: 손상된 행) 전체가
 * 자동 롤백되어 기존 데이터가 그대로 보존된다. settings 테이블도 그대로 포함되므로 기본
 * 문제은행 동기화 상태(deletedSeedIds 등)도 백업 시점 그대로 복원되어, 복원 직후 재동기화에서
 * 사용자가 삭제했던 기본 문제가 다시 생성되지 않는다.
 */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  validateBackupForRestore(backup);
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
      const rows = backup.tables[table.name];
      if (rows.length > 0) {
        await table.bulkAdd(rows);
      }
    }
  });
}
