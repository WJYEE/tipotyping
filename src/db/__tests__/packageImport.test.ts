import { beforeEach, describe, expect, it } from "vitest";
import { createBackup, restoreBackup } from "@/db/backup";
import { db } from "@/db/db";
import { attemptRepo, categoryRepo, packageRepo, questionRepo, sessionRepo, themeRepo } from "@/db/repositories";
import { syncDefaultContent } from "@/db/seed/seed";
import { buildKbBridgeBundle } from "@/lib/packages/kbBridgeBundle";
import { loadKbBridgeRaw } from "@/lib/packages/kbBridgeSource";

async function clearAllTables() {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

beforeEach(clearAllTables);

async function bundle() {
  return buildKbBridgeBundle(await loadKbBridgeRaw());
}

describe("KB-Bridge 가져오기", () => {
  it("문제·파생질문·개념·실습·메모·사이트를 KB-Bridge 패키지에 연결한다", async () => {
    const result = await packageRepo.importKbBridge(await bundle());
    expect(result.issues).toEqual([]);
    expect(result.questions.added).toBe(123);

    const questions = await packageRepo.listQuestions("kb-bridge");
    expect(questions).toHaveLength(123);
    expect(questions.every((q) => q.type === "multiple-choice" && q.reviewStatus === "needs_human_review")).toBe(true);
    expect(await packageRepo.listDerived("kb-bridge")).toHaveLength(246);
    expect(await packageRepo.listConcepts("kb-bridge")).toHaveLength(11);
    expect(await packageRepo.listTasks("kb-bridge")).toHaveLength(17);
    expect(await packageRepo.listMemos("kb-bridge")).toHaveLength(54);
    expect(await packageRepo.listResources("kb-bridge")).toHaveLength(59);

    // 다른 패키지에는 연결되지 않는다
    expect(await packageRepo.listQuestions("wjyee")).toHaveLength(0);
    expect(await packageRepo.listMemos("self-study")).toHaveLength(0);

    // 문제마다 QuestionRecord가 1:1로 있고, 11개 Theme이 생겼다
    expect(await db.questionRecords.count()).toBe(123);
    expect(await db.themes.where("categoryId").equals("kbb-category").count()).toBe(11);
    // 파생질문은 모두 실제 원본 문제를 가리킨다
    const qIds = new Set(questions.map((q) => q.id));
    expect((await db.derivedQuestions.toArray()).every((d) => qIds.has(d.parentQuestionId))).toBe(true);
  });

  it("다시 가져와도 중복이 생기지 않는다(멱등)", async () => {
    const b = await bundle();
    await packageRepo.importKbBridge(b);
    const counts = async () => ({
      q: await db.questions.count(),
      d: await db.derivedQuestions.count(),
      m: await db.packageContentMap.count(),
      memos: await db.memos.count(),
      r: await db.resourceLinks.count(),
      tags: await db.tags.count(),
      themes: await db.themes.count(),
    });
    const first = await counts();
    const again = await packageRepo.importKbBridge(b);
    expect(await counts()).toEqual(first);
    expect(again.questions).toEqual({ added: 0, existing: 123 });
    expect(again.memos.added).toBe(0);
  });

  it("기존 사용자 데이터와 풀이 기록을 건드리지 않고, 재가져오기가 풀이 기록·완료 표시·편집한 메모를 보존한다", async () => {
    await syncDefaultContent();
    const category = await categoryRepo.create({ name: "내 분류", order: 99, isCustom: true });
    const theme = await themeRepo.create({ categoryId: category.id, name: "내 테마", order: 99, isCustom: true, useDifficulty: false });
    const mine = await questionRepo.create({
      categoryId: category.id,
      themeId: theme.id,
      type: "answer-input",
      tagIds: [],
      flagged: false,
      favorite: true,
      payload: { prompt: "내 문제", answer: "a" },
    });
    const before = {
      questions: await db.questions.count(),
      themes: await db.themes.count(),
      categories: await db.categories.count(),
    };

    const b = await bundle();
    await packageRepo.importKbBridge(b);
    expect(await db.questions.count()).toBe(before.questions + 123);
    expect(await db.themes.count()).toBe(before.themes + 11);
    expect(await db.categories.count()).toBe(before.categories + 1);
    expect((await questionRepo.get(mine.id))?.favorite).toBe(true);

    // 번들 문제 풀이 기록, 실습 완료, 번들 메모 편집
    const qid = "kbb-TIPO-0001";
    const session = await sessionRepo.create({
      startedAt: 1, endedAt: null, totalDurationMs: 0, themeIds: [], tagIds: [], questionTypes: [], difficulties: [],
      orderMode: "sequential", totalAttempts: 0, correctCount: 0, wrongCount: 0, accuracy: 0,
    });
    await attemptRepo.record({ sessionId: session.id, questionId: qid, questionType: "multiple-choice", isCorrect: false, userAnswer: "1", attemptedAt: 2 });
    await packageRepo.setTaskCompleted("kbb-LAB-001", true);
    await packageRepo.updateMemo("kbb-NOTE-001", { title: "내가 고친 제목" });
    const record = await db.questionRecords.get(qid);
    expect(record?.totalAttempts).toBe(1);

    await packageRepo.importKbBridge(b);
    expect(await db.questionRecords.get(qid)).toEqual(record);
    expect(await db.attempts.count()).toBe(1);
    expect((await db.practiceTasks.get("kbb-LAB-001"))?.completedAt).not.toBeNull();
    expect((await db.memos.get("kbb-NOTE-001"))?.title).toBe("내가 고친 제목");
  });

  it("기본 문제은행 동기화(syncDefaultContent)가 가져온 문제를 지우거나 바꾸지 않는다", async () => {
    await packageRepo.importKbBridge(await bundle());
    await syncDefaultContent();
    expect(await packageRepo.listQuestions("kb-bridge")).toHaveLength(123);
    expect(await db.themes.get("kbb-theme-sql")).toBeDefined();
  });

  it("백업 → 복원 왕복 후 패키지 콘텐츠가 그대로 남는다", async () => {
    await packageRepo.importKbBridge(await bundle());
    const backup = await createBackup();
    expect(backup.tables.packageContentMap.length).toBeGreaterThan(400);
    await clearAllTables();
    await restoreBackup(backup);
    expect(await packageRepo.listQuestions("kb-bridge")).toHaveLength(123);
    expect(await packageRepo.listDerived("kb-bridge")).toHaveLength(246);
  });
});

describe("메모 추가·수정·삭제", () => {
  it("사용자 메모는 패키지별로 독립 관리된다", async () => {
    const memo = await packageRepo.createMemo("wjyee", { category: "프로젝트", title: "  팁  ", body: "내용", tags: ["a"] });
    expect(memo.origin).toBe("user");
    expect(await packageRepo.listMemos("wjyee")).toHaveLength(1);
    expect(await packageRepo.listMemos("kb-bridge")).toHaveLength(0);

    await packageRepo.updateMemo(memo.id, { body: "수정" });
    expect((await db.memos.get(memo.id))?.body).toBe("수정");

    await packageRepo.removeMemo(memo.id);
    expect(await packageRepo.listMemos("wjyee")).toHaveLength(0);
    expect(await db.packageContentMap.count()).toBe(0);
  });
});
