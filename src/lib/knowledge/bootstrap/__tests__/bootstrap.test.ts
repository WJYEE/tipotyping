import { describe, expect, it } from "vitest";
import { buildBootstrapDraft, candidateKey, type BootstrapInput, type ConceptCandidate } from "@/lib/knowledge/bootstrap/buildDraft";
import { matchMetaTag } from "@/lib/knowledge/bootstrap/metaTagRules";
import { prepareText, questionEvidenceText, textMentions } from "@/lib/knowledge/bootstrap/questionText";
import { defaultDecisions, resolveBootstrapPlan, validateCandidateName } from "@/lib/knowledge/bootstrap/resolvePlan";
import type { Question, Tag, Theme } from "@/types/domain";
import type { KnowledgeConcept, QuestionConcept } from "@/types/knowledge";

// ───────────── fixture helpers ─────────────

const theme = (id: string, name: string, order = 0): Theme => ({ id, categoryId: "cat", name, order, isCustom: true, useDifficulty: false });
const tag = (id: string, name: string): Tag => ({ id, name });
let seq = 0;
const question = (id: string, themeId: string, tagIds: string[], prompt: string): Question => ({
  id,
  displayCode: `Q-${++seq}`,
  categoryId: "cat",
  themeId,
  tagIds,
  type: "answer-input",
  flagged: false,
  favorite: false,
  payload: { prompt, answer: "a" },
  createdAt: 1,
  updatedAt: 1,
});
const concept = (id: string, themeId: string, name: string, extra: Partial<KnowledgeConcept> = {}): KnowledgeConcept => ({
  id,
  name,
  nameKey: name.toLowerCase(),
  aliases: [],
  themeId,
  origin: "user",
  archived: false,
  createdAt: 1,
  updatedAt: 1,
  ...extra,
});

/**
 * SQL Theme(20문제): SQL(전부) · JOIN(4, 본문에도 등장) · 윈도우함수(3, 본문엔 안 나옴) · 면접(3) · ROW(1) · 서브쿼리(4, 본문 등장, 하지만 Theme의 40% → 범위 넓음)
 * + Python Theme(문제 없음), 보안이 4개 Theme(A·B·C·D)에 걸쳐 쓰임
 */
function sqlFixture(): BootstrapInput {
  const themes = [theme("sql", "SQL", 0), theme("py", "Python", 1), theme("a", "A", 2), theme("b", "B", 3), theme("c", "C", 4), theme("d", "D", 5)];
  const tags = [
    tag("t-sql", "SQL"),
    tag("t-join", "JOIN"),
    tag("t-win", "윈도우함수"),
    tag("t-int", "면접"),
    tag("t-row", "ROW"),
    tag("t-sub", "서브쿼리"),
    tag("t-sec", "보안"),
  ];
  const questions: Question[] = [
    question("q1", "sql", ["t-sql", "t-join"], "LEFT JOIN과 INNER JOIN의 차이는?"),
    question("q2", "sql", ["t-sql", "t-join", "t-int"], "CROSS JOIN이란?"),
    question("q3", "sql", ["t-sql", "t-join"], "OUTER JOIN의 종류는?"),
    question("q4", "sql", ["t-sql", "t-join", "t-int"], "self join을 설명하세요"),
    question("q5", "sql", ["t-sql", "t-win", "t-int"], "ROW_NUMBER 와 RANK의 차이"),
    question("q6", "sql", ["t-sql", "t-win"], "LAG 함수의 용도"),
    question("q7", "sql", ["t-sql", "t-win", "t-row"], "OVER 절의 PARTITION BY"),
    question("q8", "sql", ["t-sql", "t-sub"], "서브쿼리와 JOIN 중 무엇이 빠른가?"), // JOIN 본문에만 등장(태그 아님) 하지만 서브쿼리 태그
    question("q9", "sql", ["t-sql", "t-sub"], "서브쿼리의 종류"),
    question("q10", "sql", [], "태그 없는 문제: INNER JOIN 조건을 쓰세요"),
    question("q11", "sql", ["t-sql", "t-sub"], "스칼라 서브쿼리란?"),
    question("q12", "sql", ["t-sql", "t-sub"], "상관 서브쿼리란?"),
    question("p1", "a", ["t-sec"], "a"),
    question("p2", "b", ["t-sec"], "b"),
    question("p3", "c", ["t-sec"], "c"),
    question("p4", "d", ["t-sec"], "d"),
    // 태그 없는 일반 문제 4개 + 서브쿼리 문제 4개를 더해 JOIN은 20%, 서브쿼리는 40%(범위가 넓음)가 되게 한다
    question("q13", "sql", [], "SELECT 문의 기본 구조"),
    question("q14", "sql", [], "WHERE 절의 역할"),
    question("q15", "sql", [], "ORDER BY의 기본 정렬"),
    question("q16", "sql", [], "LIMIT의 용도"),
    question("q17", "sql", ["t-sql", "t-sub"], "IN 서브쿼리"),
    question("q18", "sql", ["t-sql", "t-sub"], "EXISTS 서브쿼리"),
    question("q19", "sql", ["t-sql", "t-sub"], "FROM 절 서브쿼리"),
    question("q20", "sql", ["t-sql", "t-sub"], "서브쿼리 성능"),
  ];
  return { themes, questions, tags, concepts: [], links: [] };
}

const sqlCandidates = (draft: ReturnType<typeof buildBootstrapDraft>) => draft.themes.find((t) => t.themeId === "sql")!;
const find = (cs: ConceptCandidate[], name: string) => cs.find((c) => c.name === name);

// ───────────── Candidate generation ─────────────

describe("buildBootstrapDraft — 후보 생성", () => {
  it("반복되는 지식형 Tag는 HIGH 후보가 되고, 근거(태그/본문)와 연결 문제를 보여 준다", () => {
    const sql = sqlCandidates(buildBootstrapDraft(sqlFixture()));
    const join = find(sql.candidates, "JOIN")!;
    expect(join).toMatchObject({ status: "NEW", confidence: "HIGH", themeId: "sql", sourceTagId: "t-join", reasons: [] });
    expect(join.stats).toMatchObject({ taggedCount: 4, textMatchedTagged: 4, textOnlyCount: 2 });
    const byEvidence = (e: string) => join.mappings.filter((m) => m.evidence === e).map((m) => m.questionId).sort();
    expect(byEvidence("tag+text")).toEqual(["q1", "q2", "q3", "q4"]);
    // Tag는 없지만 본문에 JOIN이 정확히 등장하는 문제도 후보로 제안된다(q8: 서브쿼리 문제, q10: 태그 없는 문제)
    expect(byEvidence("text")).toEqual(["q10", "q8"]);
  });

  it("Tag 이름을 그대로 별로 복사하지 않는다: Theme 이름 broad Tag / meta Tag / 여러 Theme의 일반 Tag는 후보가 아니다", () => {
    const draft = buildBootstrapDraft(sqlFixture());
    const sql = sqlCandidates(draft);
    const names = sql.candidates.map((c) => c.name);
    expect(names).not.toContain("SQL");
    expect(names).not.toContain("면접");
    const reasons = Object.fromEntries(sql.excludedTags.map((e) => [e.name, e.reason]));
    expect(reasons).toMatchObject({ SQL: "theme-broad", 면접: "meta" });
    // 보안은 4개 Theme에 쓰이는 일반 Tag
    const generic = draft.themes.flatMap((t) => t.excludedTags).filter((e) => e.name === "보안");
    expect(generic.length).toBeGreaterThan(0);
    expect(generic.every((e) => e.reason === "generic")).toBe(true);
  });

  it("본문에서 확인되지 않는 Tag는 REVIEW(low-text-evidence), 문제가 1개뿐인 Tag는 후보로 올리지 않는다", () => {
    const sql = sqlCandidates(buildBootstrapDraft(sqlFixture()));
    expect(find(sql.candidates, "윈도우함수")).toMatchObject({ confidence: "REVIEW", reasons: ["low-text-evidence"] });
    expect(find(sql.candidates, "ROW")).toBeUndefined();
    expect(sql.tooFewCount).toBe(1);
  });

  it("Theme 문제의 30%를 넘는 넓은 Tag는 근거가 좋아도 REVIEW(broad-topic)", () => {
    const sql = sqlCandidates(buildBootstrapDraft(sqlFixture()));
    expect(find(sql.candidates, "서브쿼리")).toMatchObject({ confidence: "REVIEW" });
    expect(find(sql.candidates, "서브쿼리")!.reasons).toContain("broad-topic");
  });

  it("HIGH가 REVIEW보다 앞에 정렬된다", () => {
    const sql = sqlCandidates(buildBootstrapDraft(sqlFixture()));
    const confs = sql.candidates.map((c) => c.confidence);
    expect(confs.indexOf("REVIEW")).toBeGreaterThan(confs.lastIndexOf("HIGH"));
  });

  it("문제가 없는 Theme은 분석하지 않고 센다 / 모든 Tag가 meta인 Theme은 후보가 없다", () => {
    const input: BootstrapInput = {
      themes: [theme("empty", "비어있음", 0), theme("meta", "메타만", 1)],
      tags: [tag("m1", "면접"), tag("m2", "복습기초"), tag("m3", "초급")],
      questions: [question("x1", "meta", ["m1", "m2"], "문제1"), question("x2", "meta", ["m1", "m3"], "문제2"), question("x3", "meta", ["m2", "m3"], "문제3")],
      concepts: [],
      links: [],
    };
    const draft = buildBootstrapDraft(input);
    expect(draft.emptyThemeCount).toBe(1);
    expect(draft.themes).toHaveLength(1);
    expect(draft.themes[0].candidates).toEqual([]);
    expect(draft.themes[0].excludedTags.map((e) => e.reason)).toEqual(["meta", "meta", "meta"]);
    expect(draft.totals.candidates).toBe(0);
  });

  it("Tag가 하나도 없는 Question만 있는 Theme도 안전하다", () => {
    const input: BootstrapInput = { themes: [theme("t", "T")], tags: [], questions: [question("x", "t", [], "p")], concepts: [], links: [] };
    expect(buildBootstrapDraft(input).totals.candidates).toBe(0);
  });

  it("입력을 변경하지 않고 같은 입력이면 같은 결과를 낸다(결정적)", () => {
    const input = sqlFixture();
    const snapshot = JSON.stringify(input);
    const a = buildBootstrapDraft(input);
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(buildBootstrapDraft(sqlFixture())).toEqual(a);
  });

  it("존재하지 않는 Tag id를 가진 Question도 무시하고 계속 진행한다", () => {
    const input = sqlFixture();
    input.questions.push(question("q-bad", "sql", ["없는-tag"], "x"));
    expect(() => buildBootstrapDraft(input)).not.toThrow();
  });
});

describe("question text evidence", () => {
  it("ASCII 용어는 단어 경계를 요구하고, 한글 용어는 공백을 무시한다", () => {
    expect(textMentions(prepareText("zip 파일 압축"), "IP")).toBe(false);
    expect(textMentions(prepareText("IP 주소와 서브넷"), "IP")).toBe(true);
    expect(textMentions(prepareText("윈도우 함수의 종류"), "윈도우함수")).toBe(true);
    expect(textMentions(prepareText("group  by 절"), "GROUP BY")).toBe(true);
    expect(textMentions(prepareText("무엇이든"), "무")).toBe(false); // 1글자 용어는 쓰지 않는다
  });

  it("문제 유형별로 질문 쪽 텍스트를 쓴다(객관식은 정답 보기만, 해설은 쓰지 않는다)", () => {
    const base = question("m", "t", [], "x");
    const mc = { ...base, type: "multiple-choice", payload: { prompt: "대표 알고리즘은?", options: ["BFS", "JOIN", "DFS"], correctIndex: 0 }, explanation: "JOIN과 무관" } as Question;
    const text = questionEvidenceText(mc);
    expect(text).toContain("BFS");
    expect(text).not.toContain("JOIN");
    const blank = { ...base, type: "blank", payload: { template: "SELECT * FROM a {{b1}} b ON a.id=b.id", blanks: [{ id: "b1", answer: "JOIN" }] } } as Question;
    expect(questionEvidenceText(blank)).toContain("JOIN");
    expect(questionEvidenceText(blank)).not.toContain("{{");
  });
});

describe("matchMetaTag", () => {
  it("전체 일치만 meta로 본다", () => {
    for (const name of ["초급", "중급", "복습기초", "제공정리", "Day2", "3일차", "면접", "코딩테스트", "객관식"]) {
      expect(matchMetaTag(name), name).not.toBeNull();
    }
    for (const name of ["면접관계", "JOIN", "복리", "윈도우함수"]) {
      expect(matchMetaTag(name), name).toBeNull();
    }
  });
});

// ───────────── Existing concepts ─────────────

describe("기존 KnowledgeConcept", () => {
  it("이름(정규화)과 Theme이 같은 개념은 EXISTING이 되고 이미 연결된 문제는 표시된다", () => {
    const input = sqlFixture();
    input.concepts = [concept("c-join", "sql", "join")];
    input.links = [{ id: "l1", questionId: "q1", conceptId: "c-join", role: "primary" }];
    const join = find(sqlCandidates(buildBootstrapDraft(input)).candidates, "JOIN")!;
    expect(join).toMatchObject({ status: "EXISTING", existingConceptId: "c-join", confidence: "HIGH" });
    expect(join.mappings.find((m) => m.questionId === "q1")!.alreadyLinked).toBe(true);
    expect(join.mappings.find((m) => m.questionId === "q2")!.alreadyLinked).toBe(false);
  });

  it("같은 이름의 개념이 이미 있으면 문제가 1개뿐인 Tag도 '연결 추가' 후보가 된다", () => {
    const input = sqlFixture();
    input.concepts = [concept("c-row", "sql", "ROW")];
    const row = find(sqlCandidates(buildBootstrapDraft(input)).candidates, "ROW");
    expect(row).toMatchObject({ status: "EXISTING", existingConceptId: "c-row" });
  });

  it("다른 Theme의 같은 이름 개념은 같은 개념이 아니다", () => {
    const input = sqlFixture();
    input.concepts = [concept("c-other", "py", "JOIN")];
    expect(find(sqlCandidates(buildBootstrapDraft(input)).candidates, "JOIN")!.status).toBe("NEW");
  });

  it("보관된 개념과 이름이 같으면 REVIEW(existing-archived)이고 기본으로 제외된다", () => {
    const input = sqlFixture();
    input.concepts = [concept("c-join", "sql", "JOIN", { archived: true })];
    const draft = buildBootstrapDraft(input);
    const join = find(sqlCandidates(draft).candidates, "JOIN")!;
    expect(join).toMatchObject({ status: "EXISTING", existingArchived: true, confidence: "REVIEW" });
    expect(join.reasons).toContain("existing-archived");
    expect(defaultDecisions(draft).included[join.key]).toBe(false);
    // 억지로 포함해도 계획 오류로 막힌다
    const plan = resolveBootstrapPlan(draft, { ...defaultDecisions(draft), included: { [join.key]: true } }, { concepts: input.concepts, links: [] });
    expect(plan.errors.map((e) => e.key)).toEqual([join.key]);
  });

  it("별칭만 같은 경우는 자동으로 합치지 않고 REVIEW(alias-match)로 알린다", () => {
    const input = sqlFixture();
    input.concepts = [concept("c-x", "sql", "조인 연산", { aliases: ["JOIN"] })];
    const join = find(sqlCandidates(buildBootstrapDraft(input)).candidates, "JOIN")!;
    expect(join).toMatchObject({ status: "NEW", confidence: "REVIEW", aliasOfConceptId: "c-x" });
    expect(join.reasons).toContain("alias-match");
  });
});

// ───────────── Review decisions + plan ─────────────

describe("resolveBootstrapPlan — 포함/제외", () => {
  const draft = buildBootstrapDraft(sqlFixture());
  const state = { concepts: [] as KnowledgeConcept[], links: [] as QuestionConcept[] };
  const joinKey = candidateKey("sql", "t-join");
  const winKey = candidateKey("sql", "t-win");

  it("기본 결정: HIGH는 포함, REVIEW는 제외", () => {
    const d = defaultDecisions(draft);
    expect(d.included[joinKey]).toBe(true);
    expect(d.included[winKey]).toBe(false);
    const plan = resolveBootstrapPlan(draft, d, state);
    expect(plan.items.map((i) => i.name)).toEqual(["JOIN"]);
    expect(plan.errors).toEqual([]);
  });

  it("REVIEW 후보를 포함하면 계획에 들어가고, 제외하면 빠진다", () => {
    const d = defaultDecisions(draft);
    d.included[winKey] = true;
    expect(resolveBootstrapPlan(draft, d, state).items.map((i) => i.name).sort()).toEqual(["JOIN", "윈도우함수"]);
    d.included[joinKey] = false;
    expect(resolveBootstrapPlan(draft, d, state).items.map((i) => i.name)).toEqual(["윈도우함수"]);
  });

  it("모두 제외하면 아무것도 만들지 않는다", () => {
    const d = { included: {}, names: {}, excludedQuestions: {} };
    const plan = resolveBootstrapPlan(draft, d, state);
    expect(plan.items).toEqual([]);
    expect(plan.links).toEqual([]);
    expect(plan.summary.newLinks).toBe(0);
  });

  it("후보에서 문제를 개별 제외할 수 있다", () => {
    const d = defaultDecisions(draft);
    d.excludedQuestions[joinKey] = ["q8", "q10"];
    const plan = resolveBootstrapPlan(draft, d, state);
    expect(plan.links.map((l) => l.questionId).sort()).toEqual(["q1", "q2", "q3", "q4"]);
  });
});

describe("resolveBootstrapPlan — 이름 수정과 중복 검증", () => {
  const draft = buildBootstrapDraft(sqlFixture());
  const joinKey = candidateKey("sql", "t-join");
  const winKey = candidateKey("sql", "t-win");
  const join = find(sqlCandidates(draft).candidates, "JOIN")!;

  it("수정한 이름이 계획에 반영된다(공백 정리)", () => {
    const d = defaultDecisions(draft);
    d.names[joinKey] = "  SQL   JOIN ";
    expect(resolveBootstrapPlan(draft, d, { concepts: [], links: [] }).items[0].name).toBe("SQL JOIN");
  });

  it("빈 이름은 오류", () => {
    const d = defaultDecisions(draft);
    d.names[joinKey] = "   ";
    expect(validateCandidateName(join, d, draft, [])).toMatch(/비어/);
    expect(resolveBootstrapPlan(draft, d, { concepts: [], links: [] }).errors[0].key).toBe(joinKey);
  });

  it("이미 있는 개념과 같은 이름으로 바꾸면 오류(보관된 개념 포함), 다른 Theme은 허용", () => {
    const d = defaultDecisions(draft);
    d.names[joinKey] = "서브쿼리 실행";
    const concepts = [concept("c1", "sql", "서브쿼리 실행"), concept("c2", "sql", "숨김", { archived: true })];
    expect(validateCandidateName(join, d, draft, concepts)).toMatch(/이미 있는/);
    d.names[joinKey] = "숨김";
    expect(validateCandidateName(join, d, draft, concepts)).toMatch(/보관/);
    d.names[joinKey] = "서브쿼리 실행";
    expect(validateCandidateName(join, d, draft, [concept("c3", "py", "서브쿼리 실행")])).toBeNull();
  });

  it("함께 포함된 다른 NEW 후보와 이름이 겹치면 오류, 그 후보를 제외하면 해소된다", () => {
    const d = defaultDecisions(draft);
    d.included[winKey] = true;
    d.names[winKey] = "join"; // JOIN과 정규화하면 같다
    const plan = resolveBootstrapPlan(draft, d, { concepts: [], links: [] });
    expect(plan.errors.length).toBeGreaterThan(0);
    d.included[winKey] = false;
    expect(resolveBootstrapPlan(draft, d, { concepts: [], links: [] }).errors).toEqual([]);
  });
});

describe("resolveBootstrapPlan — 문제 매핑과 primary/secondary 정책", () => {
  /** A: JOIN(Tag 3개), B: 서브쿼리(Tag 3개). q-both는 두 Tag를 모두 가진 문제, q-text는 JOIN 본문만. */
  function twoConceptInput(): BootstrapInput {
    return {
      themes: [theme("t", "T")],
      tags: [tag("a", "JOIN"), tag("b", "서브쿼리"), tag("z", "다른것")],
      questions: [
        question("a1", "t", ["a"], "JOIN 1"),
        question("a2", "t", ["a"], "JOIN 2"),
        question("a3", "t", ["a"], "JOIN 3"),
        question("b1", "t", ["b"], "서브쿼리 1"),
        question("b2", "t", ["b"], "서브쿼리 2"),
        question("b3", "t", ["b"], "서브쿼리 3"),
        question("both", "t", ["a", "b"], "JOIN 안의 서브쿼리"),
        question("txt", "t", ["z"], "이 문제는 JOIN을 쓴다"),
        question("f1", "t", ["z"], "다른것 1"),
        question("f2", "t", [], "다른것 2"),
        question("f3", "t", [], "다른것 3"),
        question("f4", "t", [], "다른것 4"),
        question("f5", "t", [], "다른것 5"),
        question("f6", "t", [], "다른것 6"),
      ],
      concepts: [],
      links: [],
    };
  }
  const roleOf = (links: { questionId: string; key: string; role: string }[], q: string, key: string) =>
    links.find((l) => l.questionId === q && l.key === key)?.role;

  it("Tag 근거가 후보 하나뿐인 문제는 primary, 여러 후보에 걸린 문제는 모두 secondary(억지로 대표를 정하지 않는다)", () => {
    const input = twoConceptInput();
    const draft = buildBootstrapDraft(input);
    const a = candidateKey("t", "a");
    const b = candidateKey("t", "b");
    const plan = resolveBootstrapPlan(draft, defaultDecisions(draft), { concepts: [], links: [] });
    expect(plan.items.map((i) => i.name).sort()).toEqual(["JOIN", "서브쿼리"]);
    expect(roleOf(plan.links, "a1", a)).toBe("primary");
    expect(roleOf(plan.links, "b1", b)).toBe("primary");
    // 한 Question이 여러 Concept에 연결됨(M:N) — 둘 다 secondary
    expect(roleOf(plan.links, "both", a)).toBe("secondary");
    expect(roleOf(plan.links, "both", b)).toBe("secondary");
    // 본문 일치뿐인 연결은 primary가 되지 않는다
    expect(roleOf(plan.links, "txt", a)).toBe("secondary");
    // 문제당 primary는 최대 1개
    const primaries = new Map<string, number>();
    for (const l of plan.links) if (l.role === "primary") primaries.set(l.questionId, (primaries.get(l.questionId) ?? 0) + 1);
    expect([...primaries.values()].every((n) => n === 1)).toBe(true);
  });

  it("이미 primary 개념이 있는 문제는 새 연결이 secondary가 된다", () => {
    const input = twoConceptInput();
    input.concepts = [concept("c-old", "t", "기존")];
    input.links = [{ id: "l", questionId: "a1", conceptId: "c-old", role: "primary" }];
    const draft = buildBootstrapDraft(input);
    const plan = resolveBootstrapPlan(draft, defaultDecisions(draft), { concepts: input.concepts, links: input.links });
    expect(roleOf(plan.links, "a1", candidateKey("t", "a"))).toBe("secondary");
    expect(roleOf(plan.links, "a2", candidateKey("t", "a"))).toBe("primary");
  });

  it("후보 하나를 제외하면 남은 후보가 대표가 될 수 있다(요약은 현재 선택 기준)", () => {
    const draft = buildBootstrapDraft(twoConceptInput());
    const d = defaultDecisions(draft);
    d.included[candidateKey("t", "b")] = false;
    const plan = resolveBootstrapPlan(draft, d, { concepts: [], links: [] });
    expect(roleOf(plan.links, "both", candidateKey("t", "a"))).toBe("primary");
  });

  it("이미 연결된 문제는 새 연결 수에서 빠지고 alreadyLinked로 센다", () => {
    const input = twoConceptInput();
    input.concepts = [concept("c-join", "t", "JOIN")];
    input.links = [
      { id: "l1", questionId: "a1", conceptId: "c-join", role: "primary" },
      { id: "l2", questionId: "a2", conceptId: "c-join", role: "primary" },
    ];
    const draft = buildBootstrapDraft(input);
    const plan = resolveBootstrapPlan(draft, defaultDecisions(draft), { concepts: input.concepts, links: input.links });
    expect(plan.summary.existingConcepts).toBe(1);
    expect(plan.summary.alreadyLinked).toBe(2);
    expect(plan.links.some((l) => l.questionId === "a1" && l.key === candidateKey("t", "a"))).toBe(false);
  });
});
