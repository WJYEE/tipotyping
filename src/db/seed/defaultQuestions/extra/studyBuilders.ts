// 수업 복습 문제(프롬프트 엔지니어링·업무자동화) 작성용 헬퍼. 배열 순서가 곧 seedId 번호이므로 항목은 끝에만 추가한다.
// 객관식은 [정답, ...오답] 순서로 적고, 보기 위치는 번호에 따라 고르게 분산한다.
import { themed } from "@/db/seed/defaultQuestions/builders";
import type { SeedQuestion } from "@/db/seed/seedTypes";

/** 학습 단계 태그: 기초(용어·정의) / 구분(비슷한 개념 구별) / 적용(상황 판단) */
export type StudyLevel = "복습기초" | "복습구분" | "복습적용";
/** 출처 태그: 수업 자료 Day1~Day3 또는 학습자가 직접 정리해 제공한 내용 */
export type StudySource = "Day1" | "Day2" | "Day3" | "제공정리";

type Meta = readonly [source: StudySource, level: StudyLevel, topic: string];

export type StudyItem =
  | { k: "mc"; q: string; correct: string; wrongs: string[]; why: string; meta: Meta }
  | { k: "input"; q: string; answer: string; why: string; meta: Meta }
  | { k: "d2t"; term: string; def: string; meta: Meta };

export const mc = (q: string, correct: string, wrongs: string[], why: string, meta: Meta): StudyItem => ({
  k: "mc",
  q,
  correct,
  wrongs,
  why,
  meta,
});
export const input = (q: string, answer: string, why: string, meta: Meta): StudyItem => ({ k: "input", q, answer, why, meta });
export const d2t = (term: string, def: string, meta: Meta): StudyItem => ({ k: "d2t", term, def, meta });

export function buildStudyQuestions(
  themeName: string,
  prefix: string,
  baseTag: string,
  items: StudyItem[],
  /** 첫 항목의 번호. 같은 Theme에 이어서 추가할 때 이미 쓰인 번호 다음 값을 준다. */
  firstNumber = 1,
): SeedQuestion[] {
  const t = themed(themeName, [baseTag]);
  return items.map((item, i) => {
    const id = `${prefix}-${String(firstNumber + i).padStart(4, "0")}`;
    const tags = [...item.meta];
    switch (item.k) {
      case "mc": {
        const options = [...item.wrongs];
        const pos = i % (item.wrongs.length + 1);
        options.splice(pos, 0, item.correct);
        return t.mc({ id, tags, why: item.why, q: item.q, options, a: pos });
      }
      case "input":
        return t.input({ id, tags, why: item.why, q: item.q, a: item.answer });
      case "d2t":
        return t.d2t({ id, tags, term: item.term, def: item.def });
    }
  });
}
