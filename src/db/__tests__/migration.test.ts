import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { generateDisplayCode } from "@/lib/displayCode";

// v1(=displayCode 없음) → v2(=displayCode 채움) 업그레이드가 실제로 동작하는지
// 별도의 DB 이름으로 격리해 검증한다. (schema.ts의 db 싱글톤과 겹치지 않도록)
const DB_NAME = "tipotyping-migration-test";

afterEach(async () => {
  await Dexie.delete(DB_NAME);
});

class LegacyV1DB extends Dexie {
  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      categories: "id, order",
      themes: "id, categoryId, order",
      tags: "id, &name",
      questions: "id, categoryId, themeId, type, difficulty, *tagIds, flagged, favorite, createdAt",
      questionRecords: "questionId, lastResult, lastAttemptAt",
      sessions: "id, startedAt",
      attempts: "id, sessionId, questionId, attemptedAt",
      settings: "id",
    });
  }
}

class UpgradedDB extends Dexie {
  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      categories: "id, order",
      themes: "id, categoryId, order",
      tags: "id, &name",
      questions: "id, categoryId, themeId, type, difficulty, *tagIds, flagged, favorite, createdAt",
      questionRecords: "questionId, lastResult, lastAttemptAt",
      sessions: "id, startedAt",
      attempts: "id, sessionId, questionId, attemptedAt",
      settings: "id",
    });
    this.version(2)
      .stores({
        questions:
          "id, categoryId, themeId, type, difficulty, *tagIds, flagged, favorite, createdAt, displayCode",
      })
      .upgrade(async (tx) => {
        const themes = await tx.table("themes").toArray();
        const themeById = new Map(themes.map((t) => [t.id, t]));
        const questions = await tx.table("questions").orderBy("createdAt").toArray();
        const assignedByTheme = new Map<string, { displayCode: string }[]>();

        for (const q of questions) {
          if (q.displayCode) continue;
          const theme = themeById.get(q.themeId);
          const key = theme?.id ?? "unknown";
          const already = assignedByTheme.get(key) ?? [];
          const displayCode = generateDisplayCode(theme ?? { id: q.themeId, name: "MISC" }, already);
          already.push({ displayCode });
          assignedByTheme.set(key, already);
          await tx.table("questions").update(q.id, { displayCode });
        }
      });
    this.version(3).stores({}).upgrade(async (tx) => {
      const themes = await tx.table("themes").toArray();
      const themeById = new Map(themes.map((t) => [t.id, t]));
      const questions = await tx.table("questions").orderBy("createdAt").toArray();
      const assignedByTheme = new Map<string, { displayCode: string }[]>();

      for (const q of questions) {
        const theme = themeById.get(q.themeId);
        const key = theme?.id ?? "unknown";
        const already = assignedByTheme.get(key) ?? [];
        const displayCode = generateDisplayCode(theme ?? { id: q.themeId, name: "MISC" }, already);
        already.push({ displayCode });
        assignedByTheme.set(key, already);
        await tx.table("questions").update(q.id, { displayCode });
      }
    });
  }
}

describe("v1 → v2 migration (displayCode 백필)", () => {
  it("기존 v1 Question들에 Theme별 순번으로 displayCode를 채워준다", async () => {
    const legacy = new LegacyV1DB();
    await legacy.open();
    await legacy.table("categories").add({ id: "c1", name: "코딩", order: 0, isCustom: false });
    await legacy.table("themes").add({
      id: "t1",
      categoryId: "c1",
      name: "SQL",
      order: 0,
      isCustom: false,
      useDifficulty: false,
    });
    await legacy.table("questions").add({
      id: "q1",
      categoryId: "c1",
      themeId: "t1",
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "1", answer: "1" },
      createdAt: 1,
      updatedAt: 1,
    });
    await legacy.table("questions").add({
      id: "q2",
      categoryId: "c1",
      themeId: "t1",
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "2", answer: "2" },
      createdAt: 2,
      updatedAt: 2,
    });
    legacy.close();

    const upgraded = new UpgradedDB();
    await upgraded.open();
    const questions = await upgraded.table("questions").orderBy("createdAt").toArray();

    expect(questions[0].displayCode).toBe("SQL-0001");
    expect(questions[1].displayCode).toBe("SQL-0002");
    upgraded.close();
  });
});

class LegacyV2DB extends Dexie {
  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      categories: "id, order",
      themes: "id, categoryId, order",
      tags: "id, &name",
      questions: "id, categoryId, themeId, type, difficulty, *tagIds, flagged, favorite, createdAt",
      questionRecords: "questionId, lastResult, lastAttemptAt",
      sessions: "id, startedAt",
      attempts: "id, sessionId, questionId, attemptedAt",
      settings: "id",
    });
    this.version(2).stores({
      questions:
        "id, categoryId, themeId, type, difficulty, *tagIds, flagged, favorite, createdAt, displayCode",
    });
  }
}

describe("v2 → v3 migration (기본 Theme displayCode 접두어 통일)", () => {
  it("한글 기본 Theme(자료구조)의 옛 id 기반 접두어를 고정 접두어(DS)로 재발급한다", async () => {
    const legacy = new LegacyV2DB();
    await legacy.open();
    await legacy.table("categories").add({ id: "c1", name: "코딩", order: 0, isCustom: false });
    await legacy.table("themes").add({
      id: "abcdef12-3456-7890",
      categoryId: "c1",
      name: "자료구조",
      order: 0,
      isCustom: false,
      useDifficulty: true,
    });
    // v2 시절 로직으로 생성됐던 것처럼 id 기반 접두어를 직접 흉내 낸다.
    await legacy.table("questions").add({
      id: "q1",
      categoryId: "c1",
      themeId: "abcdef12-3456-7890",
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "1", answer: "1" },
      displayCode: "ABCDEF-0001",
      createdAt: 1,
      updatedAt: 1,
    });
    legacy.close();

    const upgraded = new UpgradedDB();
    await upgraded.open();
    const [question] = await upgraded.table("questions").orderBy("createdAt").toArray();

    expect(question.displayCode).toBe("DS-0001");
    upgraded.close();
  });
});
