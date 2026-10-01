import { beforeEach, describe, expect, it } from "vitest";
import {
  backupFileName,
  createBackup,
  parseBackupFile,
  restoreBackup,
  validateBackupForRestore,
  type BackupFile,
} from "@/db/backup";
import { db } from "@/db/db";
import { categoryRepo, questionRepo, sessionRepo, settingsRepo, themeRepo } from "@/db/repositories";
import { getDefaultContentState, putDefaultContentState } from "@/db/seed/defaultContentState";

async function clearAllTables() {
  // db.tables를 그대로 순회한다 — backup.ts와 같은 "테이블 하드코딩 금지" 원칙.
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

beforeEach(async () => {
  await clearAllTables();
});

async function seedCategoryThemeQuestion() {
  const category = await categoryRepo.create({ name: "카테고리", order: 0, isCustom: true });
  const theme = await themeRepo.create({
    categoryId: category.id,
    name: "테마",
    order: 0,
    isCustom: true,
    useDifficulty: false,
  });
  const question = await questionRepo.create({
    categoryId: category.id,
    themeId: theme.id,
    type: "answer-input",
    tagIds: [],
    flagged: false,
    favorite: false,
    payload: { prompt: "1+1=?", answer: "2" },
  });
  return { category, theme, question };
}

describe("backupFileName", () => {
  it("tipotyping-backup-YYYY-MM-DD.json 형식이다", () => {
    expect(backupFileName(new Date("2026-03-05T12:00:00Z"))).toBe("tipotyping-backup-2026-03-05.json");
  });
});

describe("createBackup", () => {
  it("db.verno를 schemaVersion으로, ISO exportedAt과 함께 모든 테이블을 내보낸다", async () => {
    const { category, theme, question } = await seedCategoryThemeQuestion();
    const session = await sessionRepo.create({
      startedAt: 1,
      endedAt: 2,
      totalDurationMs: 15000,
      themeIds: [theme.id],
      tagIds: [],
      questionTypes: ["answer-input"],
      difficulties: [],
      orderMode: "sequential",
      totalAttempts: 0,
      correctCount: 0,
      wrongCount: 0,
      accuracy: 0,
    });
    await settingsRepo.set("dashboardRange", "30d");

    const backup = await createBackup();

    expect(backup.schemaVersion).toBe(db.verno);
    expect(() => new Date(backup.exportedAt).toISOString()).not.toThrow();

    // 테이블 하드코딩 없이 db.tables 전체가 포함돼야 한다.
    const currentTableNames = db.tables.map((t) => t.name).sort();
    expect(Object.keys(backup.tables).sort()).toEqual(currentTableNames);

    expect(backup.tables.categories).toEqual([category]);
    expect(backup.tables.themes).toEqual([theme]);
    expect((backup.tables.questions as typeof question[])[0].id).toBe(question.id);
    expect((backup.tables.sessions as typeof session[])[0].id).toBe(session.id);
    const settingsRows = backup.tables.settings as { id: string; value: unknown }[];
    expect(settingsRows.some((r) => r.id === "dashboardRange" && r.value === "30d")).toBe(true);
  });

  it("빈 DB도 모든 테이블을 빈 배열로 내보낸다 (복원 왕복에서 문제 없어야 함)", async () => {
    const backup = await createBackup();
    for (const table of db.tables) {
      expect(backup.tables[table.name]).toEqual([]);
    }
  });
});

describe("parseBackupFile", () => {
  it("유효한 백업 JSON을 파싱한다", () => {
    const backup = parseBackupFile(
      JSON.stringify({ schemaVersion: 1, exportedAt: "2026-01-01T00:00:00.000Z", tables: { foo: [] } }),
    );
    expect(backup.schemaVersion).toBe(1);
    expect(backup.tables).toEqual({ foo: [] });
  });

  it("JSON이 아니면 던진다", () => {
    expect(() => parseBackupFile("이건 JSON이 아님")).toThrow();
  });

  it("배열이거나 객체가 아니면 던진다", () => {
    expect(() => parseBackupFile("[]")).toThrow();
    expect(() => parseBackupFile("1")).toThrow();
  });

  it("schemaVersion이 없으면 던진다", () => {
    expect(() => parseBackupFile(JSON.stringify({ exportedAt: "x", tables: {} }))).toThrow();
  });

  it("exportedAt이 없으면 던진다", () => {
    expect(() => parseBackupFile(JSON.stringify({ schemaVersion: 1, tables: {} }))).toThrow();
  });

  it("tables가 없거나 객체가 아니면 던진다", () => {
    expect(() => parseBackupFile(JSON.stringify({ schemaVersion: 1, exportedAt: "x" }))).toThrow();
    expect(() => parseBackupFile(JSON.stringify({ schemaVersion: 1, exportedAt: "x", tables: [] }))).toThrow();
  });

  it("tables의 한 테이블이라도 배열이 아니면 던진다", () => {
    expect(() =>
      parseBackupFile(JSON.stringify({ schemaVersion: 1, exportedAt: "x", tables: { foo: "not-array" } })),
    ).toThrow();
  });
});

describe("validateBackupForRestore", () => {
  function validBackupShape(): BackupFile {
    const tables: Record<string, unknown[]> = {};
    for (const t of db.tables) tables[t.name] = [];
    return { schemaVersion: db.verno, exportedAt: new Date().toISOString(), tables };
  }

  it("schemaVersion이 현재와 같고 테이블 구성이 같으면 통과한다", () => {
    expect(() => validateBackupForRestore(validBackupShape())).not.toThrow();
  });

  it("schemaVersion이 다르면 거부한다", () => {
    const backup = { ...validBackupShape(), schemaVersion: db.verno + 1 };
    expect(() => validateBackupForRestore(backup)).toThrow();
  });

  it("백업에 없는 현재 테이블이 있으면(테이블 누락) 거부한다", () => {
    const backup = validBackupShape();
    delete backup.tables[db.tables[0].name];
    expect(() => validateBackupForRestore(backup)).toThrow();
  });

  it("백업에 현재 앱에 없는 낯선 테이블이 섞여 있으면 거부한다", () => {
    const backup = validBackupShape();
    backup.tables["알수없는테이블"] = [];
    expect(() => validateBackupForRestore(backup)).toThrow();
  });
});

describe("restoreBackup", () => {
  it("전체 데이터를 백업 시점 상태로 되돌린다", async () => {
    const { category, theme } = await seedCategoryThemeQuestion();
    const backup = await createBackup();

    // 백업 이후 데이터가 더 생긴다.
    await questionRepo.create({
      categoryId: category.id,
      themeId: theme.id,
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "나중에 추가된 문제", answer: "x" },
    });
    expect((await questionRepo.list()).length).toBe(2);

    await restoreBackup(backup);

    const questions = await questionRepo.list();
    expect(questions).toHaveLength(1);
    expect(questions[0].payload).toEqual({ prompt: "1+1=?", answer: "2" });
  });

  it("deletedSeedIds를 포함한 settings도 그대로 복원된다 (복원 직후 삭제했던 기본 문제가 되살아나지 않음)", async () => {
    await putDefaultContentState({
      version: 1,
      bundleHash: "abc",
      knownThemeKeys: ["SQL"],
      deletedSeedIds: ["sql-0005"],
    });
    const backup = await createBackup();

    await putDefaultContentState({
      version: 1,
      bundleHash: "abc",
      knownThemeKeys: ["SQL"],
      deletedSeedIds: [], // 백업 이후 뭔가 바뀌었다고 가정
    });

    await restoreBackup(backup);

    const state = await getDefaultContentState();
    expect(state?.deletedSeedIds).toEqual(["sql-0005"]);
  });

  it("schemaVersion이 다른 백업은 거부하고 기존 데이터를 그대로 둔다", async () => {
    const { question } = await seedCategoryThemeQuestion();
    const backup = await createBackup();
    const badBackup: BackupFile = { ...backup, schemaVersion: backup.schemaVersion + 1 };

    await expect(restoreBackup(badBackup)).rejects.toThrow();

    const questions = await questionRepo.list();
    expect(questions).toHaveLength(1);
    expect(questions[0].id).toBe(question.id);
  });

  it("복원 중간에 실패하면 트랜잭션이 롤백되어 기존 데이터가 보존된다", async () => {
    const { question } = await seedCategoryThemeQuestion();
    const backup = await createBackup();

    // 같은 id가 중복된 행을 넣어 bulkAdd가 ConstraintError로 실패하게 만든다.
    const brokenBackup: BackupFile = {
      ...backup,
      tables: {
        ...backup.tables,
        tags: [
          { id: "dup", name: "A" },
          { id: "dup", name: "B" },
        ],
      },
    };

    await expect(restoreBackup(brokenBackup)).rejects.toThrow();

    // questions 테이블도 같은 트랜잭션 안이었으므로 clear된 채로 롤백되지 않고 원래 데이터가 남아있어야 한다.
    const questions = await questionRepo.list();
    expect(questions).toHaveLength(1);
    expect(questions[0].id).toBe(question.id);
  });
});
