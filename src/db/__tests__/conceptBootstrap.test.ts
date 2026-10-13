import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { attemptRepo, categoryRepo, conceptBootstrapRepo, conceptRepo, questionConceptRepo, questionRepo, sessionRepo, tagRepo, themeRepo } from "@/db/repositories";
import { syncDefaultContent } from "@/db/seed/seed";
import { buildBootstrapDraft } from "@/lib/knowledge/bootstrap/buildDraft";
import { defaultDecisions, resolveBootstrapPlan, type BootstrapPlan } from "@/lib/knowledge/bootstrap/resolvePlan";

async function clearAllTables() {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

beforeEach(clearAllTables);

/** SQL Theme: JOIN(Tag 3개 문제, 본문에도 등장) + 서브쿼리(Tag 3개) + 겹치는 문제 하나 + 관련 없는 문제들 */
async function seedSql() {
  const category = await categoryRepo.create({ name: "코딩", order: 0, isCustom: true });
  const sql = await themeRepo.create({ categoryId: category.id, name: "SQL", order: 0, isCustom: true, useDifficulty: false });
  const join = await tagRepo.getOrCreate("JOIN");
  const sub = await tagRepo.getOrCreate("서브쿼리");
  const mk = (prompt: string, tagIds: string[]) =>
    questionRepo.create({ categoryId: category.id, themeId: sql.id, type: "answer-input", tagIds, flagged: false, favorite: false, payload: { prompt, answer: "a" } });
  const j1 = await mk("LEFT JOIN이란?", [join.id]);
  const j2 = await mk("INNER JOIN이란?", [join.id]);
  const j3 = await mk("CROSS JOIN이란?", [join.id]);
  const s1 = await mk("서브쿼리란?", [sub.id]);
  const s2 = await mk("상관 서브쿼리란?", [sub.id]);
  const s3 = await mk("스칼라 서브쿼리란?", [sub.id]);
  const both = await mk("서브쿼리 안의 JOIN", [join.id, sub.id]);
  for (let i = 0; i < 12; i++) await mk(`기타 문제 ${i}`, []);
  return { category, sql, join, sub, j1, j2, j3, s1, s2, s3, both };
}

async function planFor() {
  const input = await conceptBootstrapRepo.loadInput();
  const draft = buildBootstrapDraft(input);
  const decisions = defaultDecisions(draft);
  const plan = resolveBootstrapPlan(draft, decisions, { concepts: input.concepts, links: input.links });
  return { input, draft, decisions, plan };
}

async function snapshotLearningTables() {
  const [questions, tags, themes, categories, attempts, sessions, records] = await Promise.all([
    db.questions.toArray(),
    db.tags.toArray(),
    db.themes.toArray(),
    db.categories.toArray(),
    db.attempts.toArray(),
    db.sessions.toArray(),
    db.questionRecords.toArray(),
  ]);
  return JSON.stringify({ questions, tags, themes, categories, attempts, sessions, records });
}

describe("분석은 읽기 전용이다(Draft)", () => {
  it("loadInput / buildBootstrapDraft / resolveBootstrapPlan은 DB를 전혀 바꾸지 않는다", async () => {
    await seedSql();
    const before = await snapshotLearningTables();
    const { draft, plan } = await planFor();
    expect(draft.totals.candidates).toBeGreaterThan(0);
    expect(plan.items.length).toBeGreaterThan(0);
    expect(await db.knowledgeConcepts.count()).toBe(0);
    expect(await db.questionConcepts.count()).toBe(0);
    expect(await snapshotLearningTables()).toBe(before);
  });
});

describe("conceptBootstrapRepo.apply", () => {
  it("NEW 개념(origin=tag-promoted)과 QuestionConcept를 만들고 기존 학습 데이터는 바꾸지 않는다", async () => {
    const { sql, j1, both, s1 } = await seedSql();
    const session = await sessionRepo.create({
      startedAt: 1, endedAt: null, totalDurationMs: 0, themeIds: [], tagIds: [], questionTypes: ["answer-input"], difficulties: [],
      orderMode: "sequential", totalAttempts: 0, correctCount: 0, wrongCount: 0, accuracy: 0,
    });
    await attemptRepo.record({ sessionId: session.id, questionId: j1.id, questionType: "answer-input", isCorrect: true, userAnswer: "a", attemptedAt: 5 });
    const before = await snapshotLearningTables();

    const { plan } = await planFor();
    expect(plan.errors).toEqual([]);
    const result = await conceptBootstrapRepo.apply(plan);

    expect(result).toMatchObject({ createdConcepts: 2, reusedConcepts: 0, warnings: [] });
    const concepts = await conceptRepo.listByTheme(sql.id);
    expect(concepts.map((c) => c.name).sort()).toEqual(["JOIN", "서브쿼리"]);
    expect(concepts.every((c) => c.origin === "tag-promoted" && c.archived === false)).toBe(true);

    const join = concepts.find((c) => c.name === "JOIN")!;
    const sub = concepts.find((c) => c.name === "서브쿼리")!;
    // 문제 하나가 여러 개념에 연결된다(M:N). 근거가 여럿이라 대표를 정하지 않고 둘 다 secondary.
    const bothLinks = await questionConceptRepo.listByQuestion(both.id);
    expect(bothLinks.map((l) => [l.conceptId, l.role]).sort()).toEqual([[join.id, "secondary"], [sub.id, "secondary"]].sort());
    // 근거가 하나뿐인 문제는 primary
    expect((await questionConceptRepo.listByQuestion(j1.id))[0]).toMatchObject({ conceptId: join.id, role: "primary" });
    expect((await questionConceptRepo.listByQuestion(s1.id))[0]).toMatchObject({ conceptId: sub.id, role: "primary" });

    // 학습 데이터는 그대로: Question / Tag / Theme / Category / Attempt / Session / QuestionRecord
    expect(await snapshotLearningTables()).toBe(before);
    // 증거 집계로 이어진다: j1의 시도가 JOIN 개념의 증거가 된다
    expect((await conceptRepo.getEvidence(join.id))!).toMatchObject({ linkedQuestionCount: 4, attemptCount: 1, correctCount: 1 });
  });

  it("멱등: 같은 계획을 다시 적용해도 개념과 연결이 중복되지 않는다", async () => {
    await seedSql();
    const { plan } = await planFor();
    await conceptBootstrapRepo.apply(plan);
    const concepts = await db.knowledgeConcepts.count();
    const links = await db.questionConcepts.count();

    const again = await conceptBootstrapRepo.apply(plan);
    expect(again).toMatchObject({ createdConcepts: 0, createdLinks: 0, reusedConcepts: 2 });
    expect(await db.knowledgeConcepts.count()).toBe(concepts);
    expect(await db.questionConcepts.count()).toBe(links);
  });

  it("재분석하면 만든 개념이 EXISTING이 되고 새로 만들 것이 없다", async () => {
    await seedSql();
    await conceptBootstrapRepo.apply((await planFor()).plan);
    const { draft, plan } = await planFor();
    const candidates = draft.themes.flatMap((t) => t.candidates);
    expect(candidates.filter((c) => c.confidence === "HIGH").every((c) => c.status === "EXISTING")).toBe(true);
    expect(plan.summary).toMatchObject({ newConcepts: 0, newLinks: 0 });
    const result = await conceptBootstrapRepo.apply(plan);
    expect(result.createdConcepts + result.createdLinks).toBe(0);
  });

  it("EXISTING 개념에는 새 개념을 만들지 않고 연결만 추가한다", async () => {
    const { sql, j1 } = await seedSql();
    const existing = await conceptRepo.create({ name: "join", themeId: sql.id }); // 이름이 정규화하면 같다
    await questionConceptRepo.connect(j1.id, existing.id, "primary");
    const { plan } = await planFor();
    expect(plan.summary.existingConcepts).toBe(1);
    const result = await conceptBootstrapRepo.apply(plan);
    expect(result.createdConcepts).toBe(1); // 서브쿼리만 새로 생긴다
    expect((await conceptRepo.listByTheme(sql.id)).filter((c) => c.nameKey === "join")).toHaveLength(1);
    expect((await questionConceptRepo.listByConcept(existing.id)).length).toBe(4);
    // 기존 연결(j1 primary)은 그대로
    expect((await questionConceptRepo.listByQuestion(j1.id))[0].role).toBe("primary");
  });

  it("적용 시점에 문제에 이미 primary가 있으면 secondary로 연결하고 primary는 최대 하나다", async () => {
    const { sql, j2 } = await seedSql();
    const { plan } = await planFor();
    // 검토 중에 다른 개념이 j2의 primary가 된 상황
    const other = await conceptRepo.create({ name: "다른 개념", themeId: sql.id });
    await questionConceptRepo.connect(j2.id, other.id, "primary");
    await conceptBootstrapRepo.apply(plan);
    const links = await questionConceptRepo.listByQuestion(j2.id);
    expect(links.filter((l) => l.role === "primary")).toHaveLength(1);
    expect(links.find((l) => l.conceptId === other.id)!.role).toBe("primary");
  });

  it("보관된 개념과 이름이 같은 후보는 건너뛰고 개념/연결을 만들지 않는다", async () => {
    const { sql } = await seedSql();
    const archived = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    await conceptRepo.archive(archived.id);
    const { draft, plan } = await planFor();
    const join = draft.themes[0].candidates.find((c) => c.name === "JOIN")!;
    expect(join.existingArchived).toBe(true);
    expect(plan.items.map((i) => i.name)).not.toContain("JOIN");
    await conceptBootstrapRepo.apply(plan);
    expect(await questionConceptRepo.listByConcept(archived.id)).toEqual([]);
  });

  it("중간에 실패하면 전부 롤백된다(개념이 일부만 생기지 않는다)", async () => {
    const { sql, j1 } = await seedSql();
    const good = { key: "k1", themeId: sql.id, name: "정상 개념", sourceTagId: "x" };
    const bad = { key: "k2", themeId: "존재하지-않는-theme", name: "깨진 개념", sourceTagId: "y" };
    const plan: BootstrapPlan = {
      items: [good, bad],
      links: [{ key: "k1", questionId: j1.id, role: "primary" }],
      errors: [],
      summary: { newConcepts: 2, existingConcepts: 0, newLinks: 1, primaryLinks: 1, secondaryLinks: 0, alreadyLinked: 0, questionsTouched: 1 },
    };
    await expect(conceptBootstrapRepo.apply(plan)).rejects.toThrow();
    expect(await db.knowledgeConcepts.count()).toBe(0);
    expect(await db.questionConcepts.count()).toBe(0);
  });

  it("해결되지 않은 오류가 있는 계획은 아무것도 적용하지 않는다", async () => {
    await seedSql();
    const { plan } = await planFor();
    await expect(conceptBootstrapRepo.apply({ ...plan, errors: [{ key: "k", message: "x" }] })).rejects.toThrow();
    expect(await db.knowledgeConcepts.count()).toBe(0);
  });

  it("검토 중 삭제된 문제의 연결은 건너뛴다", async () => {
    const { j3 } = await seedSql();
    const { plan } = await planFor();
    await questionRepo.remove(j3.id);
    const result = await conceptBootstrapRepo.apply(plan);
    expect(result.skippedLinks).toBeGreaterThanOrEqual(1);
    expect(await db.questionConcepts.where("questionId").equals(j3.id).count()).toBe(0);
  });

  it("후보가 하나도 없는 DB도 안전하게 비어 있는 계획을 적용한다", async () => {
    const { plan, draft } = await planFor();
    expect(draft.totals.candidates).toBe(0);
    expect(await conceptBootstrapRepo.apply(plan)).toMatchObject({ createdConcepts: 0, createdLinks: 0 });
  });
});

describe("실제 번들 문제은행 데이터로 분석", () => {
  it("meta/broad Tag는 후보가 되지 않고, 분석은 읽기 전용이며, HIGH 후보가 존재한다", async () => {
    await syncDefaultContent();
    const questionCount = await db.questions.count();
    expect(questionCount).toBeGreaterThan(1000);

    const { draft } = await planFor();
    const all = draft.themes.flatMap((t) => t.candidates);
    const names = (themeName: string) => draft.themes.find((t) => t.themeName === themeName)!.candidates.map((c) => c.name);

    // Theme 이름 broad Tag
    expect(names("SQL")).not.toContain("SQL");
    expect(names("Python")).not.toContain("Python");
    // 학습 절차 meta Tag와 여러 Theme의 일반 Tag는 어떤 Theme에서도 후보가 되지 않는다
    for (const banned of ["제공정리", "복습기초", "복습구분", "복습적용", "우선검토점수", "보안"]) {
      expect(all.map((c) => c.name), banned).not.toContain(banned);
    }
    // 대표 개념 Tag는 HIGH 후보
    const sqlJoin = draft.themes.find((t) => t.themeName === "SQL")!.candidates.find((c) => c.name === "JOIN")!;
    expect(sqlJoin).toMatchObject({ status: "NEW", confidence: "HIGH" });
    expect(sqlJoin.mappings.length).toBeGreaterThanOrEqual(sqlJoin.stats.taggedCount);

    // 보수적: HIGH는 소수이고 대부분은 사용자의 검토 대상(REVIEW)이다
    expect(draft.totals.high).toBeGreaterThan(10);
    expect(draft.totals.high).toBeLessThan(draft.totals.candidates / 2);
    // 분석은 DB를 바꾸지 않는다
    expect(await db.knowledgeConcepts.count()).toBe(0);
    expect(await db.questionConcepts.count()).toBe(0);
  }, 120_000);

  it("HIGH 전체를 적용해도 문제당 primary는 최대 1개이고, 두 번째 적용은 아무것도 만들지 않는다", async () => {
    await syncDefaultContent();
    const { plan } = await planFor();
    expect(plan.errors).toEqual([]);
    const first = await conceptBootstrapRepo.apply(plan);
    expect(first.createdConcepts).toBe(plan.summary.newConcepts);
    expect(first.createdLinks).toBe(plan.summary.newLinks);

    const perQuestion = new Map<string, number>();
    for (const l of await db.questionConcepts.toArray()) if (l.role === "primary") perQuestion.set(l.questionId, (perQuestion.get(l.questionId) ?? 0) + 1);
    expect([...perQuestion.values()].every((n) => n === 1)).toBe(true);

    const second = await conceptBootstrapRepo.apply(plan);
    expect(second.createdConcepts + second.createdLinks).toBe(0);
  }, 120_000);
});
