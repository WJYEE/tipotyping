// 번들 기본 문제은행 동기화(syncDefaultContent) 시나리오 테스트.
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { questionRepo } from "@/db/repositories";
import { getDefaultContentState, seedContentHash } from "@/db/seed/defaultContentState";
import { defaultCategories } from "@/db/seed/defaultCategories";
import { defaultQuestions } from "@/db/seed/defaultQuestions";
import { syncDefaultContent } from "@/db/seed/seed";
import type { Attempt, Question, Session, Tag, Theme } from "@/types/domain";

async function clearAllTables() {
  // db.tables를 그대로 순회한다 — 잠금 범위를 테이블 목록과 분리해 하드코딩하면 새 테이블(Career 등)이
  // 추가될 때마다 범위 밖 테이블을 clear()하려다 NotFoundError가 나는 식으로 깨진다.
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

beforeEach(clearAllTables);

/**
 * 첫 커밋 시절 seedIfEmpty로 시드된 뒤 사용자가 쓰던 DB를 재현한다.
 * - 기본 Category 8개 / Theme 42개 (seedKey 없음), settings에 동기화 상태 없음
 * - 당시 샘플 6문제 중 4문제만 남아 있음 (3개는 현재 번들과 내용이 완전히 같고, PRIMARY KEY는 현재 번들에 없음)
 * - 학습 기록·세션·즐겨찾기·플래그·메모, 사용자 Theme/문제, 기본 Theme에 직접 추가한 문제
 */
async function buildLegacyFourQuestionDb(options: { deleteThemeName?: string } = {}) {
  const themeIdByName = new Map<string, string>();
  for (const [ci, cat] of defaultCategories.entries()) {
    const categoryId = `cat-${ci}`;
    await db.categories.add({ id: categoryId, name: cat.name, order: ci, isCustom: false });
    for (const [ti, t] of cat.themes.entries()) {
      if (t.name === options.deleteThemeName) continue;
      const id = `theme-${ci}-${ti}`;
      themeIdByName.set(t.name, id);
      await db.themes.add({ id, categoryId, name: t.name, order: ti, isCustom: false, useDifficulty: t.useDifficulty });
    }
  }
  const categoryIdOf = async (themeName: string) => (await db.themes.get(themeIdByName.get(themeName)!))!.categoryId;

  const tags: Tag[] = ["SQL", "WHERE", "DB", "Python", "내태그"].map((name) => ({ id: `tag-${name}`, name }));
  await db.tags.bulkAdd(tags);

  const legacy = async (
    id: string,
    themeName: string,
    displayCode: string,
    createdAt: number,
    q: Pick<Question, "type" | "payload"> & Partial<Question>,
  ) => {
    const question = {
      id,
      displayCode,
      categoryId: await categoryIdOf(themeName),
      themeId: themeIdByName.get(themeName)!,
      tagIds: [],
      flagged: false,
      favorite: false,
      createdAt,
      updatedAt: createdAt,
      ...q,
    } as Question;
    await db.questions.add(question);
    await db.questionRecords.add({
      questionId: id,
      totalAttempts: 0,
      correctCount: 0,
      wrongCount: 0,
      lastResult: null,
      lastAttemptAt: null,
    });
  };

  // 당시 샘플 중 남은 4문제
  await legacy("legacy-where", "SQL", "SQL-0001", 1, {
    type: "blank",
    difficulty: "beginner",
    tagIds: ["tag-SQL", "tag-WHERE"],
    explanation: "WHERE 절은 조건에 맞는 행만 필터링한다.",
    payload: { template: "SELECT * FROM users {{b1}} id = 1;", blanks: [{ id: "b1", answer: "WHERE" }] },
    favorite: true,
    memo: "헷갈림",
  });
  await legacy("legacy-pk", "데이터베이스", "DB-0001", 2, {
    type: "def-to-term",
    tagIds: ["tag-DB"],
    payload: { term: "PRIMARY KEY", definition: "테이블에서 각 행을 고유하게 식별하는 제약조건" },
    flagged: true,
  });
  await legacy("legacy-py", "Python", "PY-0001", 3, {
    type: "answer-input",
    difficulty: "beginner",
    tagIds: ["tag-Python"],
    payload: { prompt: "print(3 ** 2) 의 출력 결과는?", answer: "9" },
  });
  await legacy("legacy-rdbms", "데이터베이스", "DB-0002", 4, {
    type: "multiple-choice",
    tagIds: ["tag-DB"],
    payload: { prompt: "다음 중 RDBMS가 아닌 것은?", options: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"], correctIndex: 2 },
  });

  // 학습 기록
  await db.questionRecords.update("legacy-where", {
    totalAttempts: 3,
    correctCount: 1,
    wrongCount: 2,
    lastResult: "wrong",
    lastAttemptAt: 100,
  });
  const session: Session = {
    id: "session-1",
    startedAt: 50,
    endedAt: 200,
    totalDurationMs: 150,
    themeIds: [themeIdByName.get("SQL")!],
    tagIds: [],
    questionTypes: ["blank"],
    difficulties: [],
    orderMode: "sequential",
    totalAttempts: 3,
    correctCount: 1,
    wrongCount: 2,
    accuracy: 1 / 3,
  };
  await db.sessions.add(session);
  const attempts: Attempt[] = [1, 2, 3].map((n) => ({
    id: `attempt-${n}`,
    sessionId: "session-1",
    questionId: "legacy-where",
    questionType: "blank",
    isCorrect: n === 3,
    userAnswer: n === 3 ? "WHERE" : "WHEN",
    attemptedAt: 100 + n,
  }));
  await db.attempts.bulkAdd(attempts);

  // 사용자 Category/Theme/문제 + 기본 Theme에 직접 추가한 문제
  await db.categories.add({ id: "cat-user", name: "나만의", order: 8, isCustom: true });
  await db.themes.add({ id: "theme-user", categoryId: "cat-user", name: "고급 중국어", order: 0, isCustom: true, useDifficulty: false });
  await legacy("user-own", "SQL", "SQL-0002", 5, {
    type: "answer-input",
    difficulty: "advanced",
    tagIds: ["tag-내태그"],
    payload: { prompt: "내가 만든 SQL 문제", answer: "직접" },
  });
  await db.questions.add({
    id: "user-custom",
    displayCode: "CUSTOM-0001",
    categoryId: "cat-user",
    themeId: "theme-user",
    type: "def-to-term",
    tagIds: [],
    flagged: false,
    favorite: true,
    payload: { term: "你好", definition: "안녕하세요" },
    createdAt: 6,
    updatedAt: 6,
  } as Question);
  await db.questionRecords.add({
    questionId: "user-custom",
    totalAttempts: 0,
    correctCount: 0,
    wrongCount: 0,
    lastResult: null,
    lastAttemptAt: null,
  });
}

function seedOf(seedId: string) {
  return defaultQuestions.find((q) => q.seedId === seedId)!;
}

describe("syncDefaultContent: 기존 4문제 DB → 번들 기본 문제은행", () => {
  it("번들 문제를 모두 추가하고, 확실히 같은 3문제만 연결하며, 사용자 데이터를 모두 보존한다", async () => {
    await buildLegacyFourQuestionDb();
    const beforeRecord = await db.questionRecords.get("legacy-where");

    const result = await syncDefaultContent();

    expect(result.linked).toBe(3);
    expect(result.added).toBe(defaultQuestions.length - 3);
    expect(result.createdThemes).toBe(0);

    const questions = await db.questions.toArray();
    // 번들 1,109 + 연결 안 된 옛 샘플(PRIMARY KEY) 1 + 사용자 문제 2
    expect(questions).toHaveLength(defaultQuestions.length + 3);

    // 번들 seedId가 정확히 한 번씩 존재 (중복 없음)
    const seedIds = questions.map((q) => q.seedId).filter(Boolean);
    expect(seedIds).toHaveLength(defaultQuestions.length);
    expect(new Set(seedIds).size).toBe(defaultQuestions.length);

    // 연결된 문제: id/displayCode/즐겨찾기/메모/학습기록 유지
    const where = (await db.questions.get("legacy-where"))!;
    expect(where.seedId).toBe("sql-0001");
    expect(where.displayCode).toBe("SQL-0001");
    expect(where.favorite).toBe(true);
    expect(where.memo).toBe("헷갈림");
    expect(await db.questionRecords.get("legacy-where")).toEqual(beforeRecord);
    expect(await db.attempts.where("questionId").equals("legacy-where").count()).toBe(3);
    expect(await db.sessions.get("session-1")).toBeDefined();
    expect((await db.questions.get("legacy-py"))!.seedId).toBe(seedOf("py-0001").seedId);
    expect((await db.questions.get("legacy-rdbms"))!.seedId).toMatch(/^db-\d{4}$/);

    // 번들에 같은 문제가 없는 옛 샘플은 그대로 (seedId 없음, 플래그 유지)
    const pk = (await db.questions.get("legacy-pk"))!;
    expect(pk.seedId).toBeUndefined();
    expect(pk.flagged).toBe(true);
    expect(pk.displayCode).toBe("DB-0001");

    // 사용자 생성 문제 보존
    expect((await db.questions.get("user-own"))!.seedId).toBeUndefined();
    expect((await db.questions.get("user-custom"))!.favorite).toBe(true);

    // displayCode는 Theme 안에서 중복되지 않는다 (새 문제는 기존 번호 다음부터)
    const byTheme = new Map<string, string[]>();
    for (const q of questions) byTheme.set(q.themeId, [...(byTheme.get(q.themeId) ?? []), q.displayCode]);
    for (const codes of byTheme.values()) expect(new Set(codes).size).toBe(codes.length);

    // 모든 새 문제에 QuestionRecord가 1:1로 생성된다
    expect(await db.questionRecords.count()).toBe(questions.length);

    // 기본 Theme에 seedKey가 붙고, Theme/Category가 새로 생기지 않는다
    const themes: Theme[] = await db.themes.toArray();
    expect(themes.filter((t) => t.seedKey)).toHaveLength(42);
    expect((await db.themes.get("theme-user"))!.seedKey).toBeUndefined();
    expect(await db.categories.count()).toBe(9);
  });

  it("idempotent: 다시 실행해도(강제 실행 포함) 아무것도 바뀌지 않는다", async () => {
    await buildLegacyFourQuestionDb();
    await syncDefaultContent();
    const snapshot = await db.questions.toArray();

    expect((await syncDefaultContent()).skipped).toBe(true);
    const forced = await syncDefaultContent({ force: true });
    expect(forced).toMatchObject({ linked: 0, added: 0, updated: 0, createdThemes: 0 });
    expect(await db.questions.toArray()).toEqual(snapshot);
  });

  it("삭제한 기본 Theme은 복원하지 않고 그 Theme의 번들 문제도 추가하지 않는다", async () => {
    await buildLegacyFourQuestionDb({ deleteThemeName: "스페인어" });
    const result = await syncDefaultContent();

    expect(result.createdThemes).toBe(0);
    expect(await db.themes.filter((t) => t.name === "스페인어").count()).toBe(0);
    const spanish = defaultQuestions.filter((q) => q.themeName === "스페인어");
    expect(result.added).toBe(defaultQuestions.length - 3 - spanish.length);
  });
});

describe("syncDefaultContent: 이후 번들 업데이트", () => {
  it("최초 설치 후 사용자가 삭제한 번들 문제는 다시 만들지 않는다", async () => {
    await syncDefaultContent();
    const target = (await db.questions.where("seedId").equals("sql-0005").first())!;
    await questionRepo.remove(target.id);

    const result = await syncDefaultContent({ force: true });
    expect(result.added).toBe(0);
    expect(await db.questions.where("seedId").equals("sql-0005").count()).toBe(0);
    expect((await getDefaultContentState())!.deletedSeedIds).toContain("sql-0005");
  });

  it("사용자가 수정하지 않은 문제만 번들 개선 내용으로 갱신하고, 수정한 문제는 보존한다", async () => {
    await syncDefaultContent();
    const untouched = (await db.questions.where("seedId").equals("sql-0002").first())!;
    const edited = (await db.questions.where("seedId").equals("sql-0003").first())!;
    await db.questionRecords.update(untouched.id, { totalAttempts: 5, correctCount: 5 });

    // 예전 번들 버전이 시드했던 상태를 흉내 낸다: 내용이 달랐고 seedHash도 그 내용 기준.
    const tagNames = async (q: Question) => (await db.tags.bulkGet(q.tagIds)).map((t) => t!.name);
    const oldPayload = { ...untouched.payload, template: "SELECT dept FROM employees {{b1}} dept;" } as Question["payload"];
    await db.questions.update(untouched.id, {
      payload: oldPayload,
      seedHash: seedContentHash({ ...untouched, payload: oldPayload, tagNames: await tagNames(untouched) }),
    });
    // 사용자가 직접 수정: 내용만 바뀌고 seedHash는 그대로
    await db.questions.update(edited.id, { explanation: "내가 쓴 해설" });

    const result = await syncDefaultContent({ force: true });
    expect(result.updated).toBe(1);
    expect(result.keptUserModified).toBe(1);

    const after = (await db.questions.get(untouched.id))!;
    expect(after.payload).toEqual(seedOf("sql-0002").payload);
    expect(after.displayCode).toBe(untouched.displayCode);
    expect((await db.questionRecords.get(untouched.id))!.totalAttempts).toBe(5);
    expect((await db.questions.get(edited.id))!.explanation).toBe("내가 쓴 해설");

    // 갱신 후 다시 실행해도 변화 없음
    expect(await syncDefaultContent({ force: true })).toMatchObject({ updated: 0, keptUserModified: 1 });
  });

  it("Game Typing '정답 수정'(questionRepo.update로 payload만 변경)도 사용자 수정으로 인식해 보존한다", async () => {
    await syncDefaultContent();
    const bundled = (await db.questions.where("seedId").equals("sql-0001").first())!;
    expect(bundled.type).toBe("blank");
    const editedPayload = {
      ...(bundled.payload as { template: string; blanks: { id: string; answer: string }[] }),
      blanks: (bundled.payload as { blanks: { id: string; answer: string }[] }).blanks.map((b) => ({
        ...b,
        answer: `${b.answer}-수정됨`,
      })),
    };

    // AnswerEditModal이 호출하는 것과 동일한 경로: payload만 바꾼다.
    await questionRepo.update(bundled.id, { payload: editedPayload });

    const result = await syncDefaultContent({ force: true });
    expect(result.keptUserModified).toBe(1);

    const after = (await db.questions.get(bundled.id))!;
    expect(after.payload).toEqual(editedPayload);
  });

  it("기본 Theme 이름을 바꿔도 seedKey로 계속 동기화되고, 새 Theme을 만들지 않는다", async () => {
    await syncDefaultContent();
    const sql = (await db.themes.filter((t) => t.seedKey === "SQL").first())!;
    await db.themes.update(sql.id, { name: "SQL 연습" });

    const result = await syncDefaultContent({ force: true });
    expect(result.createdThemes).toBe(0);
    expect(await db.themes.count()).toBe(42);
  });
});
