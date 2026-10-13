// Question에서 "이 문제가 무엇에 대한 것인지"를 보여 주는 텍스트와, 그 안에서 용어를 정확히 찾는 함수.
// 단순 부분 문자열 매칭이 아니라: ASCII 용어는 단어 경계를 요구하고(IP가 'zip'에 걸리지 않게),
// 한글 포함 용어는 공백/구두점을 무시하고 비교한다("윈도우 함수" ≡ "윈도우함수").
import type { Question } from "@/types/domain";

/** 질문 쪽 텍스트만 쓴다: 프롬프트/템플릿/용어/정답. 객관식은 오답 보기를 빼고 정답 보기만 쓰며, 해설은 쓰지 않는다. */
export function questionEvidenceText(q: Question): string {
  switch (q.type) {
    case "blank": {
      const answers = q.payload.blanks.map((b) => b.answer).join(" ");
      return `${q.payload.template.replace(/\{\{[^}]*\}\}/g, " ")} ${answers}`;
    }
    case "term-to-def":
    case "def-to-term":
      return `${q.payload.term} ${q.payload.definition}`;
    case "answer-input": {
      const a = q.payload.answer;
      return `${q.payload.prompt} ${Array.isArray(a) ? a.join(" ") : a}`;
    }
    case "multiple-choice":
      return `${q.payload.prompt} ${q.payload.options[q.payload.correctIndex] ?? ""}`;
    case "essay":
      return `${q.payload.prompt} ${q.payload.answer}`;
  }
}

const ASCII_TERM = /^[a-z0-9 ]+$/;

function collapse(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function compact(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/[\s_\-·.,:;!?()[\]{}"'`/\\]/g, "");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 텍스트를 한 번만 전처리해 두고 여러 용어를 빠르게 검사하기 위한 형태. */
export interface PreparedText {
  collapsed: string;
  compact: string;
}

export function prepareText(text: string): PreparedText {
  return { collapsed: collapse(text), compact: compact(text) };
}

/** term이 text에 "정확히 등장"하는지. 1글자 용어는 항상 false(너무 흔하다). */
export function textMentions(text: PreparedText, term: string): boolean {
  const t = collapse(term);
  if (ASCII_TERM.test(t)) {
    if (t.length < 2) return false;
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(t)}($|[^a-z0-9])`).test(text.collapsed);
  }
  const c = compact(term);
  if (c.length < 2) return false;
  return text.compact.includes(c);
}
