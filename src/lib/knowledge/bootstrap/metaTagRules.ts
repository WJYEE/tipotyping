// "지식 개념이 아닐 가능성이 높은 Tag"를 알아보는 작은 명시적 규칙 모음. 이 파일 한 곳에서만 관리한다.
//
// 근거: 번들 기본 문제은행(1,713문제 / 42 Theme)을 실측해 보니 Tag에 개념 외의 의미가 섞여 있었다.
//   - 학습 절차/출처: 제공정리, 복습기초, 복습구분, 복습적용, 우선검토점수 (여러 Theme에 반복)
//   - 학습 순서: Day1, Day2, Day3
//   (난이도/면접/코딩테스트 같은 문맥 Tag는 번들에는 없지만 사용자 Tag에서 흔하다.)
// 규칙은 의도적으로 작고 "전체 일치"만 쓴다(부분 일치로 '면접관계' 같은 정상 개념을 지우지 않기 위해).
// 여기 걸린 Tag도 삭제/변경하지 않는다 — Concept 후보에서만 빠지고, 검토 화면에 "제외된 Tag"로 이유와 함께 보인다.
//
// Theme 이름과 같은 broad Tag, 여러 Theme에 반복되는 일반어 Tag는 이 목록이 아니라 데이터 통계(buildDraft)로 판단한다.

export type MetaTagKind = "difficulty" | "review-process" | "lesson-order" | "context" | "format";

export interface MetaTagRule {
  kind: MetaTagKind;
  /** Tag 이름 전체와 일치해야 한다(앞뒤 공백 제거, 대소문자 무시). */
  pattern: RegExp;
  /** 왜 개념이 아닌가 — 검토 화면과 코드 리뷰를 위한 설명 */
  why: string;
}

export const META_TAG_RULES: readonly MetaTagRule[] = [
  {
    kind: "difficulty",
    pattern: /^(초급|중급|고급|입문|초보|심화|beginner|intermediate|advanced|easy|medium|hard|난이도.*)$/i,
    why: "난이도 표시",
  },
  {
    kind: "review-process",
    pattern: /^(복습.*|제공정리|우선검토.*|오답.*|재시험)$/,
    why: "학습 절차/복습 단계 표시",
  },
  {
    kind: "lesson-order",
    pattern: /^(day\s*\d+|week\s*\d+|lesson\s*\d+|chapter\s*\d+|\d+\s*일차|\d+\s*주차)$/i,
    why: "학습 순서(회차) 표시",
  },
  {
    kind: "context",
    pattern: /^(면접|코딩테스트|코테|실전|기출|중요|핵심|자격증|취업|금융권|실무)$/,
    why: "시험/용도/맥락 표시",
  },
  {
    kind: "format",
    pattern: /^(객관식|주관식|서술형|단답형|빈칸|암기)$/,
    why: "문제 형식 표시",
  },
];

export function matchMetaTag(tagName: string): MetaTagRule | null {
  const name = tagName.normalize("NFKC").trim();
  return META_TAG_RULES.find((rule) => rule.pattern.test(name)) ?? null;
}
