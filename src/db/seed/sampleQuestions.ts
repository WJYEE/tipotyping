// DB 동작 검증용 소량 샘플 문제. 6개 문제 유형을 각 1개씩만 포함한다.
// (대량 기본 문제 생성은 이후 단계에서 별도로 진행)

import type { Difficulty, Question, QuestionType } from "@/types/domain";

export interface SeedQuestion {
  themeName: string;
  type: QuestionType;
  difficulty?: Difficulty;
  tagNames: string[];
  explanation?: string;
  payload: Question["payload"];
}

export const sampleQuestions: SeedQuestion[] = [
  {
    themeName: "SQL",
    type: "blank",
    difficulty: "beginner",
    tagNames: ["SQL", "WHERE"],
    explanation: "WHERE 절은 조건에 맞는 행만 필터링한다.",
    payload: {
      template: "SELECT * FROM users {{b1}} id = 1;",
      blanks: [{ id: "b1", answer: "WHERE" }],
    },
  },
  {
    themeName: "SQL",
    type: "term-to-def",
    tagNames: ["SQL", "INDEX"],
    payload: {
      term: "INDEX",
      definition: "테이블 조회 속도를 높이기 위해 사용하는 자료구조",
    },
  },
  {
    themeName: "데이터베이스",
    type: "def-to-term",
    tagNames: ["DB"],
    payload: {
      term: "PRIMARY KEY",
      definition: "테이블에서 각 행을 고유하게 식별하는 제약조건",
    },
  },
  {
    themeName: "Python",
    type: "answer-input",
    difficulty: "beginner",
    tagNames: ["Python"],
    payload: {
      prompt: "print(3 ** 2) 의 출력 결과는?",
      answer: "9",
    },
  },
  {
    themeName: "데이터베이스",
    type: "multiple-choice",
    tagNames: ["DB"],
    payload: {
      prompt: "다음 중 RDBMS가 아닌 것은?",
      options: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"],
      correctIndex: 2,
    },
  },
  {
    themeName: "AI 기초",
    type: "essay",
    tagNames: ["ML"],
    payload: {
      prompt: "지도학습과 비지도학습의 차이를 한 문장으로 설명하시오.",
      answer:
        "지도학습은 정답 레이블이 있는 데이터로 학습하고, 비지도학습은 레이블 없이 데이터의 패턴을 찾는다.",
    },
  },
];
