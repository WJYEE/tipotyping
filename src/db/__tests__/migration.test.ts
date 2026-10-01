import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { pruneEmptySessions, upgradeAnswerInputAlternatives, upgradeCustomThemeDisplayCodes } from "@/db/schema";
import { generateDisplayCode } from "@/lib/displayCode";

const CAREER_V8_STORES = {
  companies: "id, name",
  jobPostings: "id, companyId, createdAt, updatedAt",
  requirements: "id, jobPostingId, sourceSection, createdAt",
  competencies: "id, &name, category",
  roles: "id, &name",
  requirementCompetencies: "id, requirementId, competencyId",
  requirementRoles: "id, requirementId, roleId",
};

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

const V2_QUESTIONS_INDEX =
  "id, categoryId, themeId, type, difficulty, *tagIds, flagged, favorite, createdAt, displayCode";

class V4DB extends LegacyV2DB {
  constructor() {
    super();
    this.version(3).stores({});
    this.version(4).stores({ questions: V2_QUESTIONS_INDEX }).upgrade(upgradeCustomThemeDisplayCodes);
  }
}

describe("v3 → v4 migration (사용자 Theme fallback 접두어 정리)", () => {
  it("순한글 사용자 Theme의 id 기반 접두어를 CUSTOM으로 바꾸고 번호는 유지한다", async () => {
    const legacy = new LegacyV2DB();
    legacy.version(3).stores({});
    await legacy.open();
    await legacy.table("categories").add({ id: "c1", name: "나만의", order: 0, isCustom: true });
    await legacy.table("themes").add({
      id: "abcdef12-3456-7890",
      categoryId: "c1",
      name: "고급 중국어",
      order: 0,
      isCustom: true,
      useDifficulty: false,
    });
    await legacy.table("questions").add({
      id: "q1",
      categoryId: "c1",
      themeId: "abcdef12-3456-7890",
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: false,
      payload: { prompt: "1", answer: "1" },
      displayCode: "ABCDEF-0007",
      createdAt: 1,
      updatedAt: 1,
    });
    legacy.close();

    const upgraded = new V4DB();
    await upgraded.open();
    const [question] = await upgraded.table("questions").toArray();
    expect(question.displayCode).toBe("CUSTOM-0007");
    upgraded.close();
  });
});

class V6DB extends V4DB {
  constructor() {
    super();
    this.version(5).stores({ questions: V2_QUESTIONS_INDEX + ", seedId" });
    this.version(6).stores({}).upgrade(upgradeAnswerInputAlternatives);
  }
}

describe("v5 → v6 migration (answer-input 복수 정답 쉼표 문자열 → 배열)", () => {
  it("쉼표로 이은 복수 정답은 배열로 분리한다", async () => {
    const legacy = new LegacyV2DB();
    legacy.version(3).stores({});
    legacy.version(4).stores({});
    legacy.version(5).stores({ questions: V2_QUESTIONS_INDEX + ", seedId" });
    await legacy.open();
    await legacy.table("categories").add({ id: "c1", name: "영어", order: 0, isCustom: false });
    await legacy.table("themes").add({
      id: "t1",
      categoryId: "c1",
      name: "어휘",
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
      payload: { prompt: "postpone", answer: "미루다, 연기하다" },
      displayCode: "VOC-0001",
      createdAt: 1,
      updatedAt: 1,
    });
    legacy.close();

    const upgraded = new V6DB();
    await upgraded.open();
    const [question] = await upgraded.table("questions").toArray();
    expect(question.payload.answer).toEqual(["미루다", "연기하다"]);
    upgraded.close();
  });

  it("숫자 천단위 구분 쉼표처럼 의미상 대체 정답이 아닌 경우는 그대로 둔다", async () => {
    const legacy = new LegacyV2DB();
    legacy.version(3).stores({});
    legacy.version(4).stores({});
    legacy.version(5).stores({ questions: V2_QUESTIONS_INDEX + ", seedId" });
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
      payload: { prompt: "원가는?", answer: "10,000" },
      displayCode: "SQL-0001",
      createdAt: 1,
      updatedAt: 1,
    });
    legacy.close();

    const upgraded = new V6DB();
    await upgraded.open();
    const [question] = await upgraded.table("questions").toArray();
    expect(question.payload.answer).toBe("10,000");
    upgraded.close();
  });
});

class V7DB extends V6DB {
  constructor() {
    super();
    this.version(7).stores({}).upgrade(pruneEmptySessions);
  }
}

class V9DB extends V7DB {
  constructor() {
    super();
    this.version(8).stores(CAREER_V8_STORES);
    this.version(9).stores({
      jobPostings: "id, companyId, createdAt, updatedAt, applicationEndDate",
    });
  }
}

describe("v8 → v9 migration (JobPosting 채용일정/고용형태/경력조건/근무지역 필드 추가)", () => {
  it("기존 JobPosting은 새 필드 없이도 그대로 남아있고(유실 없음), 새 필드는 undefined다", async () => {
    const legacy = new V7DB();
    legacy.version(8).stores(CAREER_V8_STORES);
    await legacy.open();

    const company = { id: "c1", name: "Toss", createdAt: 1 };
    await legacy.table("companies").add(company);
    await legacy.table("jobPostings").add({
      id: "jp1",
      companyId: "c1",
      postingTitle: "2026 상반기 공채",
      positionTitle: "Business Data Analyst",
      responsibilities: "데이터 분석",
      qualifications: "SQL 3년",
      preferredQualifications: "Python",
      createdAt: 1,
      updatedAt: 1,
    });
    legacy.close();

    const upgraded = new V9DB();
    await upgraded.open();
    const jobPostings = await upgraded.table("jobPostings").toArray();
    expect(jobPostings).toHaveLength(1);
    expect(jobPostings[0]).toMatchObject({
      id: "jp1",
      positionTitle: "Business Data Analyst",
      responsibilities: "데이터 분석",
    });
    expect(jobPostings[0].applicationEndDate).toBeUndefined();
    expect(jobPostings[0].employmentType).toBeUndefined();

    // 새 필드를 가진 JobPosting도 정상적으로 추가할 수 있다.
    await upgraded.table("jobPostings").add({
      id: "jp2",
      companyId: "c1",
      postingTitle: "하반기 공채",
      positionTitle: "PM",
      responsibilities: "",
      qualifications: "",
      preferredQualifications: "",
      applicationStartDate: "2026-09-01",
      applicationEndDate: "2026-09-30",
      employmentType: "full-time",
      experienceLevel: "entry",
      workLocation: "서울",
      createdAt: 2,
      updatedAt: 2,
    });
    const byDeadline = await upgraded.table("jobPostings").orderBy("applicationEndDate").toArray();
    expect(byDeadline.map((jp: { id: string }) => jp.id)).toContain("jp2");
    upgraded.close();
  });
});

describe("v6 → v7 migration (Attempt 0개인 빈 Session 정리)", () => {
  it("totalAttempts가 0인 Session은 삭제하고, 1개 이상인 Session은 그대로 둔다", async () => {
    const legacy = new LegacyV2DB();
    legacy.version(3).stores({});
    legacy.version(4).stores({});
    legacy.version(5).stores({ questions: V2_QUESTIONS_INDEX + ", seedId" });
    legacy.version(6).stores({});
    await legacy.open();

    await legacy.table("sessions").add({
      id: "empty-session",
      startedAt: 1,
      endedAt: 2,
      totalDurationMs: 15000,
      themeIds: ["t1"],
      tagIds: [],
      questionTypes: ["answer-input"],
      difficulties: [],
      orderMode: "sequential",
      totalAttempts: 0,
      correctCount: 0,
      wrongCount: 0,
      accuracy: 0,
    });
    await legacy.table("sessions").add({
      id: "real-session",
      startedAt: 1,
      endedAt: 2,
      totalDurationMs: 15000,
      themeIds: ["t1"],
      tagIds: [],
      questionTypes: ["answer-input"],
      difficulties: [],
      orderMode: "sequential",
      totalAttempts: 1,
      correctCount: 1,
      wrongCount: 0,
      accuracy: 1,
    });
    await legacy.table("attempts").add({
      id: "a1",
      sessionId: "real-session",
      questionId: "q1",
      questionType: "answer-input",
      isCorrect: true,
      userAnswer: "2",
      attemptedAt: 2,
    });
    legacy.close();

    const upgraded = new V7DB();
    await upgraded.open();
    const sessions = await upgraded.table("sessions").toArray();
    expect(sessions.map((s) => s.id)).toEqual(["real-session"]);
    const attempts = await upgraded.table("attempts").toArray();
    expect(attempts.map((a) => a.id)).toEqual(["a1"]);
    upgraded.close();
  });

  it("빈 Session을 가리키는 Attempt가 (비정상적으로) 남아있어도 함께 정리한다", async () => {
    const legacy = new LegacyV2DB();
    legacy.version(3).stores({});
    legacy.version(4).stores({});
    legacy.version(5).stores({ questions: V2_QUESTIONS_INDEX + ", seedId" });
    legacy.version(6).stores({});
    await legacy.open();

    await legacy.table("sessions").add({
      id: "empty-session",
      startedAt: 1,
      endedAt: null,
      totalDurationMs: 0,
      themeIds: ["t1"],
      tagIds: [],
      questionTypes: ["answer-input"],
      difficulties: [],
      orderMode: "sequential",
      totalAttempts: 0,
      correctCount: 0,
      wrongCount: 0,
      accuracy: 0,
    });
    // totalAttempts 집계와 실제 attempts 행이 어긋난 비정상 상태를 흉내낸다.
    await legacy.table("attempts").add({
      id: "stray-attempt",
      sessionId: "empty-session",
      questionId: "q1",
      questionType: "answer-input",
      isCorrect: true,
      userAnswer: "2",
      attemptedAt: 2,
    });
    legacy.close();

    const upgraded = new V7DB();
    await upgraded.open();
    expect(await upgraded.table("sessions").toArray()).toEqual([]);
    expect(await upgraded.table("attempts").toArray()).toEqual([]);
    upgraded.close();
  });
});
