import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { categoryRepo, questionRepo, themeRepo } from "@/db/repositories";
import { importQuestions, parseImportCsv, parseImportJson } from "@/lib/importQuestions";

async function clearAllTables() {
  await db.transaction(
    "rw",
    [db.categories, db.themes, db.tags, db.questions, db.questionRecords, db.sessions, db.attempts, db.settings],
    async () => {
      await Promise.all([
        db.categories.clear(),
        db.themes.clear(),
        db.tags.clear(),
        db.questions.clear(),
        db.questionRecords.clear(),
        db.sessions.clear(),
        db.attempts.clear(),
        db.settings.clear(),
      ]);
    },
  );
}

beforeEach(async () => {
  await clearAllTables();
});

async function seedCategoryTheme() {
  const category = await categoryRepo.create({ name: "코딩", order: 0, isCustom: false });
  const theme = await themeRepo.create({
    categoryId: category.id,
    name: "SQL",
    order: 0,
    isCustom: false,
    useDifficulty: true,
  });
  return { category, theme };
}

describe("parseImportJson", () => {
  it("문제 배열을 파싱한다", () => {
    const rows = parseImportJson(
      JSON.stringify([{ categoryName: "코딩", themeName: "SQL", type: "answer-input", payload: { prompt: "p", answer: "a" } }]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("answer-input");
  });

  it("배열이 아니면 에러를 던진다", () => {
    expect(() => parseImportJson(JSON.stringify({}))).toThrow();
  });
});

describe("parseImportCsv", () => {
  it("헤더와 행을 파싱하고 tags/payload를 해석한다", () => {
    const csv =
      'categoryName,themeName,type,tags,payload\n' +
      '코딩,SQL,answer-input,"SQL;WHERE","{""prompt"":""p"",""answer"":""a""}"';
    const rows = parseImportCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].tags).toEqual(["SQL", "WHERE"]);
    expect(rows[0].payload).toEqual({ prompt: "p", answer: "a" });
  });

  it("필수 컬럼이 없으면 에러를 던진다", () => {
    expect(() => parseImportCsv("foo,bar\n1,2")).toThrow();
  });
});

describe("importQuestions", () => {
  it("정상 행을 저장하고 imported 카운트를 반환한다", async () => {
    const { theme } = await seedCategoryTheme();
    const result = await importQuestions([
      {
        categoryName: "코딩",
        themeName: "SQL",
        type: "answer-input",
        tags: ["SQL"],
        payload: { prompt: "1+1=?", answer: "2" },
      },
    ]);
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);

    const questions = await questionRepo.listByTheme(theme.id);
    expect(questions).toHaveLength(1);
  });

  it("동일 ID는 Skip한다", async () => {
    await seedCategoryTheme();
    const row = {
      id: "fixed-id-1",
      categoryName: "코딩",
      themeName: "SQL",
      type: "answer-input" as const,
      payload: { prompt: "1+1=?", answer: "2" },
    };
    const first = await importQuestions([row]);
    expect(first.imported).toBe(1);

    const second = await importQuestions([row]);
    expect(second.imported).toBe(0);
    expect(second.skipped).toBe(1);
  });

  it("id가 달라도 동일 내용(테마+유형+payload)이면 Skip한다", async () => {
    await seedCategoryTheme();
    const rowA = {
      categoryName: "코딩",
      themeName: "SQL",
      type: "answer-input" as const,
      payload: { prompt: "1+1=?", answer: "2" },
    };
    const rowB = { ...rowA, id: "different-id" };

    const first = await importQuestions([rowA]);
    expect(first.imported).toBe(1);

    const second = await importQuestions([rowB]);
    expect(second.imported).toBe(0);
    expect(second.skipped).toBe(1);
  });

  it("displayCode를 지정하면 그대로 유지한다", async () => {
    await seedCategoryTheme();
    const result = await importQuestions([
      {
        categoryName: "코딩",
        themeName: "SQL",
        type: "answer-input",
        displayCode: "SQL-0099",
        payload: { prompt: "p", answer: "a" },
      },
    ]);
    expect(result.imported).toBe(1);
    const [question] = await questionRepo.list();
    expect(question.displayCode).toBe("SQL-0099");
  });

  it("displayCode가 같은 Theme에서 이미 사용 중이면 새 코드를 자동 발급한다", async () => {
    const { theme } = await seedCategoryTheme();
    await questionRepo.create(
      {
        categoryId: theme.categoryId,
        themeId: theme.id,
        type: "answer-input",
        tagIds: [],
        flagged: false,
        favorite: false,
        payload: { prompt: "existing", answer: "x" },
      },
      { displayCode: "SQL-0001" },
    );

    const result = await importQuestions([
      {
        categoryName: "코딩",
        themeName: "SQL",
        type: "answer-input",
        displayCode: "SQL-0001",
        payload: { prompt: "new", answer: "y" },
      },
    ]);
    expect(result.imported).toBe(1);
    const imported = (await questionRepo.list()).find((q) => q.payload && "prompt" in q.payload && q.payload.prompt === "new");
    expect(imported?.displayCode).not.toBe("SQL-0001");
  });

  it("존재하지 않는 카테고리/테마는 errors에 기록하고 저장하지 않는다", async () => {
    await seedCategoryTheme();
    const result = await importQuestions([
      {
        categoryName: "없는카테고리",
        themeName: "없는테마",
        type: "answer-input",
        payload: { prompt: "p", answer: "a" },
      },
    ]);
    expect(result.imported).toBe(0);
    expect(result.errors).toHaveLength(1);
  });
});
