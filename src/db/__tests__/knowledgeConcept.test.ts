import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBackup, parseBackupFile, restoreBackup, validateBackupForRestore, type BackupFile } from "@/db/backup";
import { db } from "@/db/db";
import {
  attemptRepo,
  categoryRepo,
  conceptRepo,
  questionConceptRepo,
  questionRepo,
  sessionRepo,
  themeRepo,
} from "@/db/repositories";
import { DuplicateConceptError } from "@/db/repositories/conceptRepo";
import { KNOWLEDGE_V11_STORES } from "@/db/schema";
import type { Question } from "@/types/domain";

async function clearAllTables() {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

beforeEach(clearAllTables);

async function seed() {
  const category = await categoryRepo.create({ name: "코딩", order: 0, isCustom: true });
  const sql = await themeRepo.create({ categoryId: category.id, name: "SQL", order: 0, isCustom: true, useDifficulty: false });
  const python = await themeRepo.create({ categoryId: category.id, name: "Python", order: 1, isCustom: true, useDifficulty: false });
  return { category, sql, python };
}

async function makeQuestion(categoryId: string, themeId: string, prompt = "q"): Promise<Question> {
  return questionRepo.create({
    categoryId,
    themeId,
    type: "answer-input",
    tagIds: [],
    flagged: false,
    favorite: false,
    payload: { prompt, answer: "a" },
  });
}

async function solve(questionId: string, isCorrect: boolean, attemptedAt: number) {
  const session = await sessionRepo.create({
    startedAt: attemptedAt,
    endedAt: null,
    totalDurationMs: 0,
    themeIds: [],
    tagIds: [],
    questionTypes: ["answer-input"],
    difficulties: [],
    orderMode: "sequential",
    totalAttempts: 0,
    correctCount: 0,
    wrongCount: 0,
    accuracy: 0,
  });
  await attemptRepo.record({ sessionId: session.id, questionId, questionType: "answer-input", isCorrect, userAnswer: "a", attemptedAt });
}

describe("스키마", () => {
  it("v11이고 새 테이블 두 개가 있다", () => {
    expect(db.verno).toBe(11);
    const names = db.tables.map((t) => t.name);
    expect(names).toContain("knowledgeConcepts");
    expect(names).toContain("questionConcepts");
    expect(names).toContain("tags"); // Tag 시스템은 그대로
  });
});

describe("KnowledgeConcept CRUD", () => {
  it("create: 기본값, 이름 정리, 별칭 정리, Theme 필수", async () => {
    const { sql } = await seed();
    const c = await conceptRepo.create({ name: "  JOIN ", themeId: sql.id, aliases: ["조인", "join", "조인"], description: " 테이블 결합 " });
    expect(c).toMatchObject({ name: "JOIN", nameKey: "join", themeId: sql.id, aliases: ["조인"], description: "테이블 결합", origin: "user", archived: false });
    expect(await conceptRepo.get(c.id)).toEqual(c);
    await expect(conceptRepo.create({ name: "X", themeId: "없는-theme" })).rejects.toThrow();
    await expect(conceptRepo.create({ name: "   ", themeId: sql.id })).rejects.toThrow();
  });

  it("update: 이름/별칭/설명을 바꿔도 id(Star identity)는 그대로다", async () => {
    const { sql } = await seed();
    const c = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    const updated = await conceptRepo.update(c.id, { name: "SQL JOIN", aliases: ["조인"], description: "d" });
    expect(updated.id).toBe(c.id);
    expect(updated).toMatchObject({ name: "SQL JOIN", nameKey: "sql join", aliases: ["조인"], description: "d" });
    expect(updated.createdAt).toBe(c.createdAt);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(c.updatedAt);
    expect((await conceptRepo.list()).map((x) => x.id)).toEqual([c.id]);
  });

  it("archive / unarchive: 목록에서 빠지지만 id와 연결은 유지된다", async () => {
    const { category, sql } = await seed();
    const q = await makeQuestion(category.id, sql.id);
    const c = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    await questionConceptRepo.connect(q.id, c.id);

    await conceptRepo.archive(c.id);
    expect(await conceptRepo.list()).toEqual([]);
    expect(await conceptRepo.listByTheme(sql.id)).toEqual([]);
    expect((await conceptRepo.list({ includeArchived: true }))[0]).toMatchObject({ id: c.id, archived: true });
    expect(await questionConceptRepo.listByConcept(c.id)).toHaveLength(1);
    expect(await questionConceptRepo.listConceptsForQuestion(q.id)).toEqual([]);
    expect(await questionConceptRepo.listConceptsForQuestion(q.id, { includeArchived: true })).toHaveLength(1);

    await conceptRepo.unarchive(c.id);
    expect((await conceptRepo.list()).map((x) => x.id)).toEqual([c.id]);
    await expect(conceptRepo.archive("없는-id")).rejects.toThrow();
  });

  it("listByTheme: 해당 Theme의 개념만 생성 순서대로", async () => {
    const { sql, python } = await seed();
    const a = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    const b = await conceptRepo.create({ name: "CTE", themeId: sql.id });
    await conceptRepo.create({ name: "리스트", themeId: python.id });
    expect((await conceptRepo.listByTheme(sql.id)).map((c) => c.id)).toEqual([a.id, b.id]);
  });

  it("Theme에 개념(보관된 것 포함)이 남아 있으면 Theme을 삭제할 수 없다", async () => {
    const { sql } = await seed();
    const c = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    await conceptRepo.archive(c.id);
    await expect(themeRepo.remove(sql.id)).rejects.toThrow(/개념/);
    expect(await themeRepo.get(sql.id)).toBeDefined();
  });
});

describe("개념 identity / 중복 방지", () => {
  it("같은 Theme에서 정규화된 이름이 같으면 만들 수 없다(대소문자·공백 무시)", async () => {
    const { sql } = await seed();
    await conceptRepo.create({ name: "GROUP BY", themeId: sql.id });
    await expect(conceptRepo.create({ name: "group   by", themeId: sql.id })).rejects.toBeInstanceOf(DuplicateConceptError);
    expect(await conceptRepo.list()).toHaveLength(1);
  });

  it("보관된 개념과 같은 이름도 막고, 기존 개념을 알려준다(복원 유도)", async () => {
    const { sql } = await seed();
    const c = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    await conceptRepo.archive(c.id);
    const err = await conceptRepo.create({ name: "join", themeId: sql.id }).catch((e) => e);
    expect(err).toBeInstanceOf(DuplicateConceptError);
    expect((err as DuplicateConceptError).existing.id).toBe(c.id);
  });

  it("다른 Theme의 같은 이름은 다른 개념이다", async () => {
    const { sql, python } = await seed();
    const a = await conceptRepo.create({ name: "groupby", themeId: sql.id });
    const b = await conceptRepo.create({ name: "groupby", themeId: python.id });
    expect(a.id).not.toBe(b.id);
  });

  it("자동 semantic merge는 하지 않는다: 'JOIN'과 'SQL JOIN'은 별개로 만들어진다", async () => {
    const { sql } = await seed();
    await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    await expect(conceptRepo.create({ name: "SQL JOIN", themeId: sql.id })).resolves.toBeDefined();
  });

  it("이름 수정으로 다른 개념과 겹치게 만들 수 없다(자기 자신과는 상관없음)", async () => {
    const { sql } = await seed();
    const a = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    const b = await conceptRepo.create({ name: "CTE", themeId: sql.id });
    await expect(conceptRepo.update(b.id, { name: "join" })).rejects.toBeInstanceOf(DuplicateConceptError);
    await expect(conceptRepo.update(a.id, { name: "Join" })).resolves.toMatchObject({ id: a.id, name: "Join" });
  });

  it("DB 유일 인덱스가 최후의 방어선이다(저장소를 우회해도 중복이 들어가지 않는다)", async () => {
    const { sql } = await seed();
    const c = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    await expect(db.knowledgeConcepts.add({ ...c, id: "다른-id" })).rejects.toThrow();
  });

  it("findMatches는 이름·alias가 완전히 같은 후보를 알려주지만 합치지 않는다", async () => {
    const { sql } = await seed();
    const c = await conceptRepo.create({ name: "JOIN", themeId: sql.id, aliases: ["조인"] });
    expect((await conceptRepo.findMatches(sql.id, " 조인 ")).map((x) => x.id)).toEqual([c.id]);
    expect(await conceptRepo.findMatches(sql.id, "SQL JOIN")).toEqual([]);
  });
});

describe("Question ↔ Concept M:N", () => {
  it("여러 Question이 한 Concept에 연결된다(문제 30개 → 별 하나)", async () => {
    const { category, sql } = await seed();
    const join = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    for (let i = 0; i < 30; i++) {
      const q = await makeQuestion(category.id, sql.id, `q${i}`);
      await questionConceptRepo.connect(q.id, join.id);
    }
    expect(await questionConceptRepo.listByConcept(join.id)).toHaveLength(30);
    expect(await conceptRepo.list()).toHaveLength(1);
  });

  it("한 Question이 여러 Concept에 연결된다(primary 1 + secondary)", async () => {
    const { category, sql } = await seed();
    const q = await makeQuestion(category.id, sql.id);
    const sub = await conceptRepo.create({ name: "서브쿼리", themeId: sql.id });
    const join = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    await questionConceptRepo.connect(q.id, sub.id, "primary");
    await questionConceptRepo.connect(q.id, join.id, "secondary");
    const concepts = await questionConceptRepo.listConceptsForQuestion(q.id);
    expect(concepts.map((c) => c.id)).toEqual([sub.id, join.id]); // primary가 먼저
    expect((await questionConceptRepo.listByQuestion(q.id)).map((l) => l.role).sort()).toEqual(["primary", "secondary"]);
  });

  it("connect는 멱등이고 같은 연결의 role만 바꾼다", async () => {
    const { category, sql } = await seed();
    const q = await makeQuestion(category.id, sql.id);
    const c = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    const first = await questionConceptRepo.connect(q.id, c.id, "primary");
    const again = await questionConceptRepo.connect(q.id, c.id, "secondary");
    expect(again.id).toBe(first.id);
    const links = await questionConceptRepo.listByQuestion(q.id);
    expect(links).toHaveLength(1);
    expect(links[0].role).toBe("secondary");
  });

  it("새 primary를 연결하면 기존 primary는 secondary로 내려간다(문제당 primary 최대 1개)", async () => {
    const { category, sql } = await seed();
    const q = await makeQuestion(category.id, sql.id);
    const a = await conceptRepo.create({ name: "A", themeId: sql.id });
    const b = await conceptRepo.create({ name: "B", themeId: sql.id });
    await questionConceptRepo.connect(q.id, a.id, "primary");
    await questionConceptRepo.connect(q.id, b.id, "primary");
    const roles = Object.fromEntries((await questionConceptRepo.listByQuestion(q.id)).map((l) => [l.conceptId, l.role]));
    expect(roles).toEqual({ [a.id]: "secondary", [b.id]: "primary" });
  });

  it("disconnect는 연결만 지우고 Question·Concept·Attempt는 남긴다", async () => {
    const { category, sql } = await seed();
    const q = await makeQuestion(category.id, sql.id);
    const c = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    await questionConceptRepo.connect(q.id, c.id);
    await solve(q.id, true, 10);
    expect(await questionConceptRepo.disconnect(q.id, c.id)).toBe(true);
    expect(await questionConceptRepo.disconnect(q.id, c.id)).toBe(false);
    expect(await questionRepo.get(q.id)).toBeDefined();
    expect(await conceptRepo.get(c.id)).toBeDefined();
    expect(await db.attempts.count()).toBe(1);
    expect((await conceptRepo.getEvidence(c.id))!.linkedQuestionCount).toBe(0);
  });

  it("없는 문제/개념, 보관된 개념으로의 새 연결은 거부한다", async () => {
    const { category, sql } = await seed();
    const q = await makeQuestion(category.id, sql.id);
    const c = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    await expect(questionConceptRepo.connect("없는-문제", c.id)).rejects.toThrow();
    await expect(questionConceptRepo.connect(q.id, "없는-개념")).rejects.toThrow();
    await conceptRepo.archive(c.id);
    await expect(questionConceptRepo.connect(q.id, c.id)).rejects.toThrow(/보관/);
  });

  it("Question을 삭제하면 개념 연결도 함께 정리되고 개념은 남는다", async () => {
    const { category, sql } = await seed();
    const q = await makeQuestion(category.id, sql.id);
    const c = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    await questionConceptRepo.connect(q.id, c.id);
    await questionRepo.remove(q.id);
    expect(await db.questionConcepts.count()).toBe(0);
    expect(await conceptRepo.get(c.id)).toBeDefined();
  });

  it("개념이 없는 기존 Question도 정상이다", async () => {
    const { category, sql } = await seed();
    const q = await makeQuestion(category.id, sql.id);
    expect(await questionConceptRepo.listByQuestion(q.id)).toEqual([]);
    expect(await questionConceptRepo.listConceptsForQuestion(q.id)).toEqual([]);
    await solve(q.id, true, 1);
    expect(await db.attempts.count()).toBe(1);
  });
});

describe("Learning Evidence 집계 (DB)", () => {
  it("연결된 문제들의 Attempt에서 개념별 증거를 계산한다", async () => {
    const { category, sql, python } = await seed();
    const join = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    const cte = await conceptRepo.create({ name: "CTE", themeId: sql.id });
    const lonely = await conceptRepo.create({ name: "NULL", themeId: sql.id });
    const q1 = await makeQuestion(category.id, sql.id, "1");
    const q2 = await makeQuestion(category.id, sql.id, "2");
    const q3 = await makeQuestion(category.id, sql.id, "3"); // 연결은 있지만 안 푼 문제
    const unlinked = await makeQuestion(category.id, python.id, "x");
    await questionConceptRepo.connect(q1.id, join.id, "primary");
    await questionConceptRepo.connect(q2.id, join.id, "primary");
    await questionConceptRepo.connect(q2.id, cte.id, "secondary");
    await questionConceptRepo.connect(q3.id, join.id, "primary");
    await solve(q1.id, true, 100);
    await solve(q1.id, false, 300);
    await solve(q2.id, true, 200);
    await solve(unlinked.id, true, 999);

    const evidence = await conceptRepo.listEvidence();
    expect(evidence.get(join.id)).toEqual({
      conceptId: join.id,
      linkedQuestionCount: 3,
      studiedQuestionCount: 2,
      attemptCount: 3,
      correctCount: 2,
      accuracy: 2 / 3,
      lastStudiedAt: 300,
    });
    expect(evidence.get(cte.id)).toMatchObject({ linkedQuestionCount: 1, studiedQuestionCount: 1, attemptCount: 1, correctCount: 1, accuracy: 1, lastStudiedAt: 200 });
    expect(evidence.get(lonely.id)).toMatchObject({ linkedQuestionCount: 0, attemptCount: 0, accuracy: null, lastStudiedAt: null });
    expect((await conceptRepo.getEvidence(join.id))!.attemptCount).toBe(3);
    expect(await conceptRepo.getEvidence("없는-id")).toBeUndefined();
  });

  it("Question이 추가되거나 Attempt가 늘어도 개념 id는 바뀌지 않는다", async () => {
    const { category, sql } = await seed();
    const c = await conceptRepo.create({ name: "JOIN", themeId: sql.id });
    const q = await makeQuestion(category.id, sql.id);
    await questionConceptRepo.connect(q.id, c.id);
    await solve(q.id, true, 1);
    expect((await conceptRepo.list()).map((x) => x.id)).toEqual([c.id]);
  });
});

// ───────────── Migration (v10 → v11) ─────────────

const MIGRATION_DB = "tipotyping-v11-migration-test";
const V10_STORES = {
  categories: "id, order",
  themes: "id, categoryId, order",
  tags: "id, &name",
  questions: "id, categoryId, themeId, type, difficulty, *tagIds, flagged, favorite, createdAt, displayCode, seedId",
  questionRecords: "questionId, lastResult, lastAttemptAt",
  sessions: "id, startedAt",
  attempts: "id, sessionId, questionId, attemptedAt",
  settings: "id",
  companies: "id, name",
  jobPostings: "id, companyId, createdAt, updatedAt, applicationEndDate",
  requirements: "id, jobPostingId, sourceSection, createdAt",
  competencies: "id, &name, category",
  roles: "id, &name",
  requirementCompetencies: "id, requirementId, competencyId",
  requirementRoles: "id, requirementId, roleId",
};

describe("v10 → v11 migration", () => {
  afterEach(async () => {
    await Dexie.delete(MIGRATION_DB);
  });

  it("기존 데이터는 그대로 남고 새 테이블은 비어 있으며, 변환 없이 열린다", async () => {
    const v10 = new Dexie(MIGRATION_DB);
    v10.version(10).stores(V10_STORES);
    await v10.open();
    await v10.table("categories").add({ id: "c1", name: "코딩", order: 0, isCustom: false });
    await v10.table("themes").add({ id: "t1", categoryId: "c1", name: "SQL", order: 0, isCustom: false, useDifficulty: false });
    await v10.table("tags").add({ id: "tag1", name: "JOIN" });
    await v10.table("questions").add({
      id: "q1", categoryId: "c1", themeId: "t1", type: "answer-input", tagIds: ["tag1"], flagged: false, favorite: false,
      payload: { prompt: "p", answer: "a" }, createdAt: 1, updatedAt: 1, displayCode: "SQL-0001",
    });
    await v10.table("attempts").add({ id: "a1", sessionId: "s1", questionId: "q1", questionType: "answer-input", isCorrect: true, userAnswer: "a", attemptedAt: 5 });
    await v10.table("sessions").add({ id: "s1", startedAt: 1 });
    await v10.table("competencies").add({ id: "comp1", name: "SQL 활용", category: "technical", createdAt: 1 });
    v10.close();

    const v11 = new Dexie(MIGRATION_DB);
    v11.version(10).stores(V10_STORES);
    v11.version(11).stores(KNOWLEDGE_V11_STORES);
    await v11.open();

    expect(await v11.table("questions").get("q1")).toMatchObject({ id: "q1", tagIds: ["tag1"], displayCode: "SQL-0001" });
    expect(await v11.table("tags").toArray()).toEqual([{ id: "tag1", name: "JOIN" }]);
    expect(await v11.table("attempts").count()).toBe(1);
    expect(await v11.table("sessions").count()).toBe(1);
    expect(await v11.table("competencies").count()).toBe(1);
    // 기존 Tag를 보고 자동으로 개념을 만들지 않는다.
    expect(await v11.table("knowledgeConcepts").count()).toBe(0);
    expect(await v11.table("questionConcepts").count()).toBe(0);
    v11.close();
  });
});

// ───────────── Backup / Restore ─────────────

describe("백업/복원과 knowledge 테이블", () => {
  async function seedKnowledge() {
    const { category, sql } = await seed();
    const q1 = await makeQuestion(category.id, sql.id, "1");
    const q2 = await makeQuestion(category.id, sql.id, "2");
    const join = await conceptRepo.create({ name: "JOIN", themeId: sql.id, aliases: ["조인"] });
    const cte = await conceptRepo.create({ name: "CTE", themeId: sql.id });
    await conceptRepo.archive(cte.id);
    await questionConceptRepo.connect(q1.id, join.id, "primary");
    await questionConceptRepo.connect(q2.id, join.id, "secondary");
    await solve(q1.id, true, 7);
    return { category, sql, q1, q2, join, cte };
  }

  it("신규 백업은 새 테이블을 포함하고 왕복 후 그대로 복원된다", async () => {
    await seedKnowledge();
    const backup = await createBackup();
    expect(backup.schemaVersion).toBe(11);
    expect(backup.tables.knowledgeConcepts).toHaveLength(2);
    expect(backup.tables.questionConcepts).toHaveLength(2);

    const concepts = await db.knowledgeConcepts.toArray();
    const links = await db.questionConcepts.toArray();
    await clearAllTables();
    expect(await db.knowledgeConcepts.count()).toBe(0);

    await restoreBackup(parseBackupFile(JSON.stringify(backup)));
    expect(await db.knowledgeConcepts.toArray()).toEqual(expect.arrayContaining(concepts));
    expect(await db.questionConcepts.toArray()).toEqual(expect.arrayContaining(links));
    expect(await db.attempts.count()).toBe(1);
  });

  it("v10 백업(새 테이블 없음)도 복원되고 새 테이블은 빈 채로 시작한다", async () => {
    const { category, sql } = await seed();
    const q = await makeQuestion(category.id, sql.id);
    await solve(q.id, true, 3);
    const backup = await createBackup();
    const v10Backup: BackupFile = { ...backup, schemaVersion: 10, tables: { ...backup.tables } };
    delete v10Backup.tables.knowledgeConcepts;
    delete v10Backup.tables.questionConcepts;

    // 복원 전에 현재 DB에 개념이 있어도, 복원은 "백업 시점 상태"이므로 비워진다.
    await conceptRepo.create({ name: "복원 전 개념", themeId: sql.id });
    expect(() => validateBackupForRestore(v10Backup)).not.toThrow();
    await restoreBackup(v10Backup);

    expect(await questionRepo.get(q.id)).toBeDefined();
    expect(await db.attempts.count()).toBe(1);
    expect(await db.knowledgeConcepts.count()).toBe(0);
    expect(await db.questionConcepts.count()).toBe(0);
  });

  it("변환 마이그레이션이 필요한 옛 버전(v9 이하) 백업은 계속 거부한다", async () => {
    const backup = await createBackup();
    const tables = { ...backup.tables };
    delete tables.knowledgeConcepts;
    delete tables.questionConcepts;
    expect(() => validateBackupForRestore({ ...backup, schemaVersion: 9, tables })).toThrow();
    expect(() => validateBackupForRestore({ ...backup, schemaVersion: 3, tables })).toThrow();
  });

  it("이전 버전 백업에 다른 테이블이 빠져 있거나 낯선 테이블이 있으면 거부한다", async () => {
    const backup = await createBackup();
    const v10: BackupFile = { ...backup, schemaVersion: 10, tables: { ...backup.tables } };
    delete v10.tables.knowledgeConcepts;
    delete v10.tables.questionConcepts;

    const missingCategories = { ...v10, tables: { ...v10.tables } };
    delete missingCategories.tables.categories;
    expect(() => validateBackupForRestore(missingCategories)).toThrow();
    expect(() => validateBackupForRestore({ ...v10, tables: { ...v10.tables, 낯선테이블: [] } })).toThrow();
    // v10이라고 주장하면서 v11 테이블을 담은 백업도 형식이 맞지 않는다
    expect(() => validateBackupForRestore({ ...v10, tables: { ...v10.tables, knowledgeConcepts: [] } })).toThrow();
  });

  it("앱보다 새 버전 백업은 거부한다", async () => {
    const backup = await createBackup();
    expect(() => validateBackupForRestore({ ...backup, schemaVersion: 12 })).toThrow();
  });

  it("복원 중 실패하면(손상된 행) 기존 데이터가 그대로 보존된다", async () => {
    const { join } = await seedKnowledge();
    const backup = await createBackup();
    const broken = { ...backup, tables: { ...backup.tables, knowledgeConcepts: [{ id: "dup" }, { id: "dup" }] } };
    await expect(restoreBackup(broken)).rejects.toThrow();
    expect((await conceptRepo.get(join.id))?.name).toBe("JOIN");
  });
});
