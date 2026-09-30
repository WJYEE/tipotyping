// 확장 문제은행 작성용 헬퍼. SeedQuestion 객체를 짧게 선언하기 위한 것으로 저장 형태는 동일하다.
// blank의 answers는 순서대로 {{b1}}, {{b2}}... 에 대응한다.
import type { SeedQuestion } from "@/db/seed/seedTypes";
import type { Difficulty } from "@/types/domain";

interface Common {
  /** 고정 seedId (SeedQuestion.seedId 참고) */
  id: string;
  /** Theme 기본 태그 외에 추가할 태그 */
  tags?: string[];
  d?: Difficulty;
  why?: string;
}

export function themed(themeName: string, baseTags: string[]) {
  const base = (o: Common) => ({
    seedId: o.id,
    themeName,
    tagNames: [...new Set([...baseTags, ...(o.tags ?? [])])],
    ...(o.d ? { difficulty: o.d } : {}),
    ...(o.why ? { explanation: o.why } : {}),
  });

  return {
    blank: (o: Common & { code: string; answers: string[] }): SeedQuestion => ({
      ...base(o),
      type: "blank",
      payload: { template: o.code, blanks: o.answers.map((answer, i) => ({ id: `b${i + 1}`, answer })) },
    }),
    t2d: (o: Common & { term: string; def: string }): SeedQuestion => ({
      ...base(o),
      type: "term-to-def",
      payload: { term: o.term, definition: o.def },
    }),
    d2t: (o: Common & { term: string; def: string }): SeedQuestion => ({
      ...base(o),
      type: "def-to-term",
      payload: { term: o.term, definition: o.def },
    }),
    input: (o: Common & { q: string; a: string }): SeedQuestion => ({
      ...base(o),
      type: "answer-input",
      payload: { prompt: o.q, answer: o.a },
    }),
    mc: (o: Common & { q: string; options: string[]; a: number }): SeedQuestion => ({
      ...base(o),
      type: "multiple-choice",
      payload: { prompt: o.q, options: o.options, correctIndex: o.a },
    }),
    essay: (o: Common & { q: string; a: string }): SeedQuestion => ({
      ...base(o),
      type: "essay",
      payload: { prompt: o.q, answer: o.a },
    }),
  };
}
