// 13장 Bulk Import: JSON(기본) / CSV 지원, 동일 ID 또는 동일 문제는 Skip.
import { categoryRepo } from "@/db/repositories/categoryRepo";
import { questionRepo } from "@/db/repositories/questionRepo";
import { tagRepo } from "@/db/repositories/tagRepo";
import { themeRepo } from "@/db/repositories/themeRepo";
import type { Difficulty, Question, QuestionType } from "@/types/domain";

export interface ImportRow {
  id?: string;
  categoryName: string;
  themeName: string;
  type: QuestionType;
  difficulty?: Difficulty;
  tags?: string[];
  explanation?: string;
  favorite?: boolean;
  flagged?: boolean;
  memo?: string;
  payload: Question["payload"];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

function questionSignature(themeId: string, type: QuestionType, payload: unknown): string {
  return `${themeId}|${type}|${JSON.stringify(payload)}`;
}

/** JSON 파일(문제 배열)을 ImportRow[]로 파싱한다. */
export function parseImportJson(text: string): ImportRow[] {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error("JSON은 문제 배열([...]) 형식이어야 합니다.");
  }
  return data as ImportRow[];
}

/**
 * CSV 파싱. 컬럼: id,categoryName,themeName,type,difficulty,tags,explanation,favorite,flagged,memo,payload
 * tags는 세미콜론(;)으로 구분, payload는 큰따옴표로 감싼 JSON 문자열 셀로 넣는다.
 */
export function parseImportCsv(text: string): ImportRow[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim());
  const required = ["categoryName", "themeName", "type", "payload"];
  for (const col of required) {
    if (!header.includes(col)) {
      throw new Error(`CSV 헤더에 "${col}" 컬럼이 없습니다.`);
    }
  }

  return rows.slice(1).map((cols) => {
    const rec: Record<string, string> = {};
    header.forEach((key, i) => {
      rec[key] = cols[i] ?? "";
    });

    return {
      id: rec.id || undefined,
      categoryName: rec.categoryName,
      themeName: rec.themeName,
      type: rec.type as QuestionType,
      difficulty: (rec.difficulty || undefined) as Difficulty | undefined,
      tags: rec.tags ? rec.tags.split(";").map((t) => t.trim()).filter(Boolean) : undefined,
      explanation: rec.explanation || undefined,
      favorite: rec.favorite === "true",
      flagged: rec.flagged === "true",
      memo: rec.memo || undefined,
      payload: rec.payload ? JSON.parse(rec.payload) : undefined,
    } satisfies ImportRow;
  });
}

/** 최소한의 RFC4180 스타일 CSV 파서 (큰따옴표 escape "" 지원). */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** ImportRow[]를 실제 IndexedDB에 저장한다. Category/Theme는 이름으로 기존 것만 매칭한다(자동 생성하지 않음). */
export async function importQuestions(rows: ImportRow[]): Promise<ImportResult> {
  const categories = await categoryRepo.list();
  const themes = await themeRepo.list();
  const existingQuestions = await questionRepo.list();

  const existingIds = new Set(existingQuestions.map((q) => q.id));
  const existingSignatures = new Set(
    existingQuestions.map((q) => questionSignature(q.themeId, q.type, q.payload)),
  );

  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    if (row.id && existingIds.has(row.id)) {
      result.skipped++;
      continue;
    }

    const category = categories.find((c) => c.name === row.categoryName);
    if (!category) {
      result.errors.push({ row: rowNum, reason: `카테고리를 찾을 수 없음: ${row.categoryName}` });
      continue;
    }
    const theme = themes.find((t) => t.categoryId === category.id && t.name === row.themeName);
    if (!theme) {
      result.errors.push({ row: rowNum, reason: `테마를 찾을 수 없음: ${row.themeName}` });
      continue;
    }
    if (!row.payload) {
      result.errors.push({ row: rowNum, reason: "payload가 비어 있음" });
      continue;
    }

    const signature = questionSignature(theme.id, row.type, row.payload);
    if (existingSignatures.has(signature)) {
      result.skipped++;
      continue;
    }

    const tags = row.tags ? await Promise.all(row.tags.map((name) => tagRepo.getOrCreate(name))) : [];

    await questionRepo.create(
      {
        categoryId: category.id,
        themeId: theme.id,
        type: row.type,
        difficulty: row.difficulty,
        tagIds: tags.map((t) => t.id),
        explanation: row.explanation,
        flagged: row.flagged ?? false,
        favorite: row.favorite ?? false,
        memo: row.memo,
        payload: row.payload,
      } as Omit<Question, "id" | "createdAt" | "updatedAt">,
      row.id ? { id: row.id } : undefined,
    );

    existingSignatures.add(signature);
    if (row.id) existingIds.add(row.id);
    result.imported++;
  }

  return result;
}
