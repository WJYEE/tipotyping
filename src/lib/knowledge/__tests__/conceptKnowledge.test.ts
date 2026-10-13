import { describe, expect, it } from "vitest";
import { cleanAliases, cleanConceptName, normalizeConceptName } from "@/lib/knowledge/conceptName";
import { computeConceptEvidence, projectConceptToStarInput } from "@/lib/knowledge/conceptEvidence";
import type { StarNode } from "@/features/constellation/model/types";

describe("normalizeConceptName", () => {
  it("대소문자·공백·전각 문자 차이는 같은 이름으로 본다", () => {
    expect(normalizeConceptName("JOIN")).toBe(normalizeConceptName(" join "));
    expect(normalizeConceptName("GROUP   BY")).toBe(normalizeConceptName("group by"));
    expect(normalizeConceptName("ＪＯＩＮ")).toBe("join");
  });

  it("의미가 비슷한 다른 이름은 합치지 않는다", () => {
    expect(normalizeConceptName("SQL JOIN")).not.toBe(normalizeConceptName("JOIN"));
    expect(normalizeConceptName("조인")).not.toBe(normalizeConceptName("JOIN"));
  });

  it("표시 이름은 대소문자를 보존하고 공백만 정리한다", () => {
    expect(cleanConceptName("  Group   BY ")).toBe("Group BY");
  });

  it("aliases에서 빈 값·이름과 같은 값·중복을 제거한다", () => {
    expect(cleanAliases(["조인", " 조인 ", "", "join", "INNER JOIN"], "JOIN")).toEqual(["조인", "INNER JOIN"]);
  });
});

describe("computeConceptEvidence", () => {
  const concepts = [{ id: "join" }, { id: "cte" }, { id: "empty" }];
  const links = [
    { questionId: "q1", conceptId: "join" },
    { questionId: "q2", conceptId: "join" },
    { questionId: "q3", conceptId: "join" },
    { questionId: "q2", conceptId: "cte" }, // 한 문제 → 여러 개념
    { questionId: "q2", conceptId: "cte" }, // 중복 연결도 문제는 한 번만 센다
  ];
  const attempts = [
    { questionId: "q1", isCorrect: true, attemptedAt: 100 },
    { questionId: "q1", isCorrect: false, attemptedAt: 300 },
    { questionId: "q2", isCorrect: true, attemptedAt: 200 },
    { questionId: "q9", isCorrect: true, attemptedAt: 999 }, // 연결 없는 문제: 무시
  ];
  const evidence = computeConceptEvidence(concepts, links, attempts);

  it("여러 문제가 한 개념에 연결되면 문제 수·시도·정답·마지막 학습 시각을 합산한다", () => {
    expect(evidence.get("join")).toEqual({
      conceptId: "join",
      linkedQuestionCount: 3,
      studiedQuestionCount: 2, // q3은 한 번도 안 풀었다
      attemptCount: 3,
      correctCount: 2,
      accuracy: 2 / 3,
      lastStudiedAt: 300,
    });
  });

  it("한 문제의 Attempt는 연결된 모든 개념의 증거가 된다", () => {
    const cte = evidence.get("cte")!;
    expect(cte.linkedQuestionCount).toBe(1);
    expect(cte.attemptCount).toBe(1);
    expect(cte.lastStudiedAt).toBe(200);
  });

  it("Question이 없는 개념은 0 / null이다", () => {
    expect(evidence.get("empty")).toEqual({
      conceptId: "empty",
      linkedQuestionCount: 0,
      studiedQuestionCount: 0,
      attemptCount: 0,
      correctCount: 0,
      accuracy: null,
      lastStudiedAt: null,
    });
  });

  it("문제는 연결됐지만 Attempt가 없는 개념은 시도 0 / accuracy null이다", () => {
    const result = computeConceptEvidence([{ id: "c" }], [{ questionId: "q1", conceptId: "c" }], []);
    expect(result.get("c")).toMatchObject({ linkedQuestionCount: 1, studiedQuestionCount: 0, attemptCount: 0, accuracy: null, lastStudiedAt: null });
  });
});

describe("projectConceptToStarInput", () => {
  it("증거를 StarNode 필드로 옮기고 identity는 concept.id 그대로다", () => {
    const concept = { id: "concept-1", name: "JOIN", themeId: "theme-sql" };
    const evidence = computeConceptEvidence(
      [concept],
      [{ questionId: "q1", conceptId: "concept-1" }],
      [{ questionId: "q1", isCorrect: true, attemptedAt: 5 }],
    ).get("concept-1")!;
    const input = projectConceptToStarInput(concept, evidence, "cat-coding");
    expect(input).toEqual({
      id: "concept-1",
      label: "JOIN",
      categoryId: "cat-coding",
      themeId: "theme-sql",
      questionCount: 1,
      studiedCount: 1,
      attemptCount: 1,
      correctCount: 1,
      accuracy: 1,
      lastStudiedAt: 5,
    });
    // StarNode와 필드 호환: 위치/mastered/favorite만 더하면 StarNode가 된다.
    const star: StarNode = { ...input, position: [0, 0, 0], mastered: false, favorite: false };
    expect(star.id).toBe("concept-1");
  });

  it("이름이 바뀌어도 id는 유지되고 Question/Attempt가 늘어도 identity는 그대로다", () => {
    const before = projectConceptToStarInput({ id: "c", name: "JOIN", themeId: "t" }, computeConceptEvidence([{ id: "c" }], [], []).get("c")!, "k");
    const after = projectConceptToStarInput({ id: "c", name: "Join (조인)", themeId: "t" }, computeConceptEvidence([{ id: "c" }], [{ questionId: "q", conceptId: "c" }], [{ questionId: "q", isCorrect: true, attemptedAt: 1 }]).get("c")!, "k");
    expect(after.id).toBe(before.id);
    expect(after.label).not.toBe(before.label);
  });
});
