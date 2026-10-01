// 언어 확장 문제 작성용 헬퍼. 배열에 적은 순서가 곧 seedId 번호가 되므로 항목은 끝에만 추가한다(순서 변경·중간 삽입 금지).
// 객관식은 [정답, ...오답] 순서로 적고, 보기 위치는 번호에 따라 고르게 분산해 정답 위치가 한쪽으로 쏠리지 않게 한다.
import { themed } from "@/db/seed/defaultQuestions/builders";
import type { SeedQuestion } from "@/db/seed/seedTypes";

/** [문제, 정답, 오답들, 해설, 태그] */
export type McItem = readonly [q: string, correct: string, wrongs: string[], why: string, tag: string];
/** [문제, 정답, 해설, 태그] — 정답이 문자열 하나로 고정되는 입력형 */
export type InputItem = readonly [q: string, answer: string, why: string, tag: string];
/** [빈칸 문장({{b1}}…), 정답들, 해설, 태그] */
export type BlankItem = readonly [template: string, answers: string[], why: string, tag: string];
/** [용어, 정의, 태그] — 정의→용어 (정의 끝에 첫 글자 힌트를 붙여 정답이 하나로 고정되게 한다) */
export type D2tItem = readonly [term: string, def: string, tag: string];

export type LangItem =
  | { k: "mc"; v: McItem }
  | { k: "input"; v: InputItem }
  | { k: "blank"; v: BlankItem }
  | { k: "d2t"; v: D2tItem };

export const mc = (v: McItem): LangItem => ({ k: "mc", v });
export const input = (v: InputItem): LangItem => ({ k: "input", v });
export const blank = (v: BlankItem): LangItem => ({ k: "blank", v });
export const d2t = (v: D2tItem): LangItem => ({ k: "d2t", v });

/**
 * @param themeName 기본 Theme 이름
 * @param prefix seedId 접두어 (예: eng)
 * @param firstNumber 첫 항목의 번호 (이미 쓰인 번호 다음 값)
 * @param baseTag Theme 기본 태그
 */
export function buildLanguageQuestions(
  themeName: string,
  prefix: string,
  firstNumber: number,
  baseTag: string,
  items: LangItem[],
): SeedQuestion[] {
  const t = themed(themeName, [baseTag]);
  return items.map((item, i) => {
    const id = `${prefix}-${String(firstNumber + i).padStart(4, "0")}`;
    switch (item.k) {
      case "mc": {
        const [q, correct, wrongs, why, tag] = item.v;
        const options = [...wrongs];
        const pos = i % (wrongs.length + 1);
        options.splice(pos, 0, correct);
        return t.mc({ id, tags: [tag], why, q, options, a: pos });
      }
      case "input": {
        const [q, a, why, tag] = item.v;
        return t.input({ id, tags: [tag], why, q, a });
      }
      case "blank": {
        const [code, answers, why, tag] = item.v;
        return t.blank({ id, tags: [tag], why, code, answers });
      }
      case "d2t": {
        const [term, def, tag] = item.v;
        return t.d2t({ id, tags: [tag], term, def });
      }
    }
  });
}
