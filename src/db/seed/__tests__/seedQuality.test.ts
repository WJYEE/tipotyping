// 기본 문제은행 콘텐츠 QA. 스키마·중복·displayCode·Exact Match 모호성·정답/해설 불일치 등을 자동 검증한다.
import { describe, expect, it } from "vitest";
import { defaultCategories } from "@/db/seed/defaultCategories";
import { defaultQuestions, type SeedQuestion } from "@/db/seed/defaultQuestions";
import { DEFAULT_THEME_PREFIXES, generateDisplayCode } from "@/lib/displayCode";

const THEMES = defaultCategories.flatMap((c) => c.themes);
const THEME_BY_NAME = new Map(THEMES.map((t) => [t.name, t]));

function payloadOf(q: SeedQuestion): Record<string, unknown> {
  return q.payload as unknown as Record<string, unknown>;
}

/** 문제의 "학습 포인트"를 대표하는 텍스트 (용어형은 term, 나머지는 prompt/template). */
function keyText(q: SeedQuestion): string {
  const p = payloadOf(q);
  return String(p.term ?? p.prompt ?? p.template ?? "");
}

/** 정답으로 타이핑해야 하는 문자열 (객관식 제외). */
function typedAnswers(q: SeedQuestion): string[] {
  const p = payloadOf(q);
  switch (q.type) {
    case "blank":
      return (p.blanks as { answer: string }[]).map((b) => b.answer);
    case "term-to-def":
      return [p.definition as string];
    case "def-to-term":
      return [p.term as string];
    case "answer-input":
    case "essay":
      return [p.answer as string];
    default:
      return [];
  }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s.,!?·'"`]/g, "");
}

function bigrams(s: string): Set<string> {
  const n = s.replace(/\s+/g, "");
  const set = new Set<string>();
  for (let i = 0; i < n.length - 1; i++) set.add(n.slice(i, i + 2));
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

function label(q: SeedQuestion): string {
  return `[${q.themeName}/${q.type}] ${keyText(q).slice(0, 60)}`;
}

describe("기본 문제은행 QA", () => {
  it("스키마: 유형별 필수 필드가 비어 있지 않고 형식이 맞다", () => {
    const problems: string[] = [];
    for (const q of defaultQuestions) {
      const p = payloadOf(q);
      const nonEmpty = (v: unknown) => typeof v === "string" && v.trim().length > 0;
      switch (q.type) {
        case "blank": {
          const blanks = p.blanks as { id: string; answer: string }[];
          const template = p.template as string;
          const ids = blanks.map((b) => b.id);
          const inTemplate = [...template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
          if (!nonEmpty(template) || blanks.length === 0) problems.push(`빈 blank: ${label(q)}`);
          if (new Set(ids).size !== ids.length) problems.push(`blank id 중복: ${label(q)}`);
          if (inTemplate.sort().join() !== [...ids].sort().join()) problems.push(`template/blank 불일치: ${label(q)}`);
          if (blanks.some((b) => !nonEmpty(b.answer))) problems.push(`빈 blank 정답: ${label(q)}`);
          break;
        }
        case "term-to-def":
        case "def-to-term":
          if (!nonEmpty(p.term) || !nonEmpty(p.definition)) problems.push(`빈 term/definition: ${label(q)}`);
          break;
        case "answer-input":
        case "essay":
          if (!nonEmpty(p.prompt) || !nonEmpty(p.answer)) problems.push(`빈 prompt/answer: ${label(q)}`);
          break;
        case "multiple-choice": {
          const options = p.options as string[];
          const idx = p.correctIndex as number;
          if (!nonEmpty(p.prompt)) problems.push(`빈 prompt: ${label(q)}`);
          if (options.length < 2 || options.some((o) => !nonEmpty(o))) problems.push(`보기 오류: ${label(q)}`);
          if (new Set(options.map((o) => o.trim().toLowerCase())).size !== options.length) problems.push(`보기 중복: ${label(q)}`);
          if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) problems.push(`정답 index 범위 밖: ${label(q)}`);
          break;
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("Theme/Tag: 모든 문제가 실제 Theme을 참조하고 태그가 유효하다", () => {
    const problems: string[] = [];
    for (const q of defaultQuestions) {
      if (!THEME_BY_NAME.has(q.themeName)) problems.push(`알 수 없는 Theme: ${label(q)}`);
      if (q.tagNames.length === 0) problems.push(`태그 없음: ${label(q)}`);
      if (q.tagNames.some((t) => t.trim() !== t || t.length === 0)) problems.push(`태그 공백: ${label(q)}`);
      if (new Set(q.tagNames).size !== q.tagNames.length) problems.push(`태그 중복: ${label(q)}`);
    }
    expect(problems).toEqual([]);
  });

  it("난이도: 난이도 사용 Theme(코딩)은 모두 지정되고, 그 외 Theme에는 없다", () => {
    const problems: string[] = [];
    for (const q of defaultQuestions) {
      const useDifficulty = THEME_BY_NAME.get(q.themeName)?.useDifficulty;
      if (useDifficulty && !q.difficulty) problems.push(`난이도 누락: ${label(q)}`);
      if (!useDifficulty && q.difficulty) problems.push(`불필요한 난이도: ${label(q)}`);
    }
    expect(problems).toEqual([]);
  });

  it("PLACEHOLDER/TODO/임시 텍스트가 없다", () => {
    const suspicious = /placeholder|\btodo\b|fixme|lorem ipsum|\bxxx\b|임시\s*텍스트|\bTBD\b|\?\?\?/i;
    const found = defaultQuestions
      .filter((q) => suspicious.test(JSON.stringify(q.payload) + (q.explanation ?? "")))
      .map(label);
    expect(found).toEqual([]);
  });

  it("중복: 같은 학습 포인트(용어/문제문)가 문제은행 전체에서 두 번 나오지 않는다", () => {
    const seen = new Map<string, SeedQuestion>();
    const dups: string[] = [];
    for (const q of defaultQuestions) {
      const key = normalize(keyText(q));
      const prev = seen.get(key);
      if (prev) dups.push(`${label(prev)}  ⇔  ${label(q)}`);
      else seen.set(key, q);
    }
    expect(dups).toEqual([]);
  });

  it("근접 중복: 정의가 거의 같거나, 문제문이 거의 같으면서 정답도 같은 문제가 없다", () => {
    // 같은 틀(예: "print(...) 의 출력 결과는?")에 다른 코드를 넣은 문제는 학습 포인트가 달라 허용하고,
    // 문장만 바꾼 동일 문제(정의가 거의 같음 / 문제문이 거의 같고 정답도 같음)만 잡는다.
    const items = defaultQuestions.map((q) => {
      const p = payloadOf(q);
      const isTerm = q.type === "term-to-def" || q.type === "def-to-term";
      const text = String(p.definition ?? p.prompt ?? p.template ?? "");
      const answer = isTerm ? "" : normalize(typedAnswers(q).join("|") || String((p.options as string[] | undefined)?.[p.correctIndex as number] ?? ""));
      return { q, isTerm, grams: bigrams(text), len: text.length, answer };
    });
    const near: string[] = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (a.len < 12 || b.len < 12 || a.isTerm !== b.isTerm) continue;
        const sim = jaccard(a.grams, b.grams);
        const dup = a.isTerm ? sim >= 0.8 : sim >= 0.75 && a.answer === b.answer;
        if (dup) near.push(`${sim.toFixed(2)} ${label(a.q)}  ⇔  ${label(b.q)}`);
      }
    }
    expect(near).toEqual([]);
  });

  it("Exact Match 모호성: 정답 문자열이 한 가지로 고정되도록 작성됐다", () => {
    const problems: string[] = [];
    for (const q of defaultQuestions) {
      const p = payloadOf(q);
      if (q.type === "def-to-term" && /[()]/.test(p.term as string))
        problems.push(`정의→용어 정답에 괄호 병기(입력 형식 모호): ${label(q)}`);
      const prompt = String(p.prompt ?? p.template ?? p.definition ?? "");
      for (const a of typedAnswers(q)) {
        if (a !== a.trim() || /\s{2,}/.test(a)) problems.push(`정답 앞뒤/중복 공백: ${label(q)}`);
        if (/\s(또는|or)\s/.test(a) && q.type !== "essay" && q.type !== "term-to-def")
          problems.push(`복수 정답 표기: ${label(q)} → ${a}`);
      }
      if (q.type === "answer-input") {
        const a = p.answer as string;
        // 코드 실행 결과를 그대로 적는 문제는 쉼표·% 등이 출력의 일부다.
        const isCodeOutput = prompt.includes("출력 결과");
        if (a.length > 30) problems.push(`정답 입력형인데 정답이 너무 김: ${label(q)}`);
        if (/^\d{1,3}(,\d{3})+$/.test(a) && !isCodeOutput) problems.push(`숫자 정답에 쉼표: ${label(q)}`);
        if (/^\d{4,}$/.test(a) && !prompt.includes("숫자만")) problems.push(`큰 숫자 정답에 형식 안내 없음: ${label(q)}`);
        if (/^O\(/.test(a) && /log|\^/.test(a) && !prompt.includes("^")) problems.push(`Big-O 표기 안내 없음: ${label(q)}`);
        if (/\d%$/.test(a) && !isCodeOutput) problems.push(`% 기호까지 입력해야 하는 정답: ${label(q)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("정답/해설 일치: 계산형 정답은 해설에 등장하고, 객관식 해설이 오답 보기를 정답처럼 가리키지 않는다", () => {
    const problems: string[] = [];
    for (const q of defaultQuestions) {
      if (!q.explanation) continue;
      const p = payloadOf(q);
      if (q.type === "answer-input") {
        const a = p.answer as string;
        const numeric = a.replace(/[^\d.]/g, "");
        const expNums = q.explanation.replace(/,/g, "");
        if (/^[\d.]+$/.test(a) && !expNums.includes(numeric) && !expNums.includes(String(Number(numeric) / 10000))) {
          problems.push(`해설에 정답 수치 없음: ${label(q)} → ${a}`);
        }
      }
      if (q.type === "multiple-choice") {
        const options = p.options as string[];
        const correct = options[p.correctIndex as number];
        const mentioned = options.filter((o) => o.length >= 2 && q.explanation!.includes(o));
        const correctTokens = correct.split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 2);
        const mentionsCorrect =
          q.explanation.includes(correct) || correctTokens.some((t) => q.explanation!.includes(t));
        // "~이 아닌 것은?" 문제는 해설이 나머지(오답) 보기를 나열하는 것이 정상이다.
        const isNegative = /아닌 것|않는 것|없는 것/.test(p.prompt as string);
        if (!isNegative && mentioned.length > 0 && !mentioned.includes(correct) && !mentionsCorrect) {
          problems.push(`해설이 오답 보기만 언급: ${label(q)} → 해설 "${mentioned[0]}", 정답 "${correct}"`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("seedId: 문제은행 전체에서 유일하고 '<Theme 접두어 소문자>-0000' 형식이다", () => {
    const ids = defaultQuestions.map((q) => q.seedId);
    expect(new Set(ids).size).toBe(ids.length);
    const wrong = defaultQuestions
      .filter((q) => !new RegExp(`^${DEFAULT_THEME_PREFIXES[q.themeName].toLowerCase()}-\\d{4}$`).test(q.seedId))
      .map((q) => `${q.seedId} ${label(q)}`);
    expect(wrong).toEqual([]);
  });

  it("displayCode: 시드 순서대로 발급하면 Theme 안에서도 전체에서도 중복이 없다", () => {
    const byTheme = new Map<string, { displayCode: string }[]>();
    const all: string[] = [];
    for (const q of defaultQuestions) {
      const theme = THEME_BY_NAME.get(q.themeName)!;
      const existing = byTheme.get(q.themeName) ?? [];
      const code = generateDisplayCode({ id: `seed-${q.themeName}`, name: theme.name, isCustom: false }, existing);
      existing.push({ displayCode: code });
      byTheme.set(q.themeName, existing);
      all.push(code);
    }
    expect(new Set(all).size).toBe(all.length);
    expect(all.every((c) => /^[A-Z]+-\d{4}$/.test(c))).toBe(true);
  });

  it("분포 리포트 (Theme별 문제 수 / 유형 분포)", () => {
    const lines: string[] = [`총 문제 수: ${defaultQuestions.length}`];
    for (const cat of defaultCategories) {
      for (const t of cat.themes) {
        const qs = defaultQuestions.filter((q) => q.themeName === t.name);
        const types = new Map<string, number>();
        for (const q of qs) types.set(q.type, (types.get(q.type) ?? 0) + 1);
        lines.push(`${cat.name} > ${t.name}: ${qs.length} (${[...types].map(([k, v]) => `${k} ${v}`).join(", ")})`);
        expect(qs.length).toBeGreaterThan(0);
      }
    }
    const total = new Map<string, number>();
    for (const q of defaultQuestions) total.set(q.type, (total.get(q.type) ?? 0) + 1);
    lines.push(`유형 합계: ${[...total].map(([k, v]) => `${k} ${v}`).join(", ")}`);
    console.log(lines.join("\n"));
    expect(defaultQuestions.length).toBeGreaterThanOrEqual(800);
  });
});
