import { describe, expect, it } from "vitest";
import { isHttpUrl } from "@/lib/packages/url";
import { buildKbBridgeBundle, validateQuestion, type RawKbBridgeBundle, type RawQuestion } from "@/lib/packages/kbBridgeBundle";
import { loadKbBridgeRaw } from "@/lib/packages/kbBridgeSource";

const q = (over: Partial<RawQuestion> = {}): RawQuestion => ({
  id: "TIPO-9001",
  categoryId: "sql",
  type: "multiple_choice",
  question: "?",
  options: [
    { id: "1", text: "a" },
    { id: "2", text: "b" },
  ],
  correctOptionId: "2",
  ...over,
});

function mini(over: Partial<RawKbBridgeBundle> = {}): RawKbBridgeBundle {
  return {
    categories: [{ id: "sql", name: "SQL", package: "KB-Bridge", sortOrder: 1 }],
    questions: [q()],
    derived: [],
    guides: [],
    guideBodies: {},
    tasks: [],
    notes: [],
    sites: [],
    ...over,
  };
}

describe("validateQuestion", () => {
  const keys = new Set(["sql"]);
  it("정상 문제는 통과", () => expect(validateQuestion(q(), keys)).toBeNull());
  it("정답 id가 선택지에 없으면 오류", () => expect(validateQuestion(q({ correctOptionId: "9" }), keys)).toMatch(/정답/));
  it("선택지 중복·알 수 없는 카테고리·지원 안 하는 유형", () => {
    expect(validateQuestion(q({ options: [{ id: "1", text: "a" }, { id: "2", text: "a" }] }), keys)).toMatch(/중복/);
    expect(validateQuestion(q({ categoryId: "x" }), keys)).toMatch(/카테고리/);
    expect(validateQuestion(q({ type: "essay" }), keys)).toMatch(/유형/);
  });
});

describe("buildKbBridgeBundle", () => {
  it("오류 항목은 제외하고 issues로 보고한다", () => {
    const b = buildKbBridgeBundle(mini({ questions: [q(), q({ id: "TIPO-9002", correctOptionId: "7" })] }));
    expect(b.questions.map((x) => x.id)).toEqual(["kbb-TIPO-9001"]);
    expect(b.issues.some((i) => i.id === "TIPO-9002")).toBe(true);
  });

  it("파생질문은 원본 문제와 연결되어야 하며, 고아·카테고리 불일치는 제외한다", () => {
    const d = (id: string, parent: string, cat = "sql") => ({ id, parentQuestionId: parent, categoryId: cat, question: "설명하시오" });
    const b = buildKbBridgeBundle(mini({ derived: [d("D1", "TIPO-9001"), d("D2", "TIPO-0000"), d("D3", "TIPO-9001", "python")] }));
    expect(b.derived.map((x) => x.id)).toEqual(["kbb-D1"]);
    expect(b.derived[0].parentQuestionId).toBe("kbb-TIPO-9001");
    expect(b.issues.filter((i) => i.kind === "derived")).toHaveLength(2);
  });

  it("검수 상태를 자동으로 reviewed로 올리지 않고, 난이도 intro는 beginner로 변환한다", () => {
    const b = buildKbBridgeBundle(mini({ questions: [q({ difficulty: "intro", reviewStatus: "reviewed" })] }));
    expect(b.questions[0].reviewStatus).toBe("needs_human_review");
    expect(b.questions[0].difficulty).toBe("beginner");
    expect(b.questions[0].payload.correctIndex).toBe(1);
  });

  it("추천 사이트는 http(s)만 허용하고 중복 URL을 거른다", () => {
    const s = (url: string) => ({ category: "Python", title: "t", url });
    const b = buildKbBridgeBundle(mini({ sites: [s("https://a.com"), s("javascript:alert(1)"), s("https://a.com")] }));
    expect(b.resources).toHaveLength(1);
    expect(b.issues.filter((i) => i.kind === "site")).toHaveLength(2);
  });
});

describe("실제 KB-Bridge ZIP 콘텐츠", () => {
  it("전체가 오류 없이 변환되고 기대한 개수를 가진다", async () => {
    const b = buildKbBridgeBundle(await loadKbBridgeRaw());
    expect(b.issues).toEqual([]);
    expect(b.categories).toHaveLength(11);
    expect(b.questions).toHaveLength(123);
    expect(b.derived).toHaveLength(246);
    expect(b.concepts).toHaveLength(11);
    expect(b.tasks).toHaveLength(17);
    expect(b.memos).toHaveLength(53 + 1);
    expect(b.resources).toHaveLength(59);
    expect(new Set(b.questions.map((x) => x.id)).size).toBe(123);
    // 모든 파생질문은 변환된 원본 문제 중 하나에 연결된다
    const ids = new Set(b.questions.map((x) => x.id));
    expect(b.derived.every((d) => ids.has(d.parentQuestionId))).toBe(true);
    expect(b.questions.every((x) => x.reviewStatus === "needs_human_review")).toBe(true);
  });
});

describe("isHttpUrl", () => {
  it("http(s)만 허용한다", () => {
    expect(isHttpUrl("https://example.com/a?b=1")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "ftp://x.com", "example.com", ""]) {
      expect(isHttpUrl(bad)).toBe(false);
    }
  });
});
