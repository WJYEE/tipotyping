// 사용자 노출용 Question displayCode (예: SQL-0001) 생성 로직.
// 기본 제공 Theme은 사람이 읽을 수 있는 고정 접두어를 쓰고, 사용자가 추가한 Theme만
// (이름의 ASCII 추출 → 없으면 CUSTOM) 다른 Theme과 겹치지 않는 fallback을 사용한다.
// 내부 theme id는 어떤 경우에도 접두어로 노출하지 않는다.
import type { Theme } from "@/types/domain";

const DISPLAY_CODE_PAD = 4;
const CUSTOM_ASCII_MAX = 8;

/** ASCII가 전혀 없는(예: 순한글) 사용자 Theme의 기본 접두어. 충돌 시 CUSTOM2, CUSTOM3... */
export const CUSTOM_FALLBACK_PREFIX = "CUSTOM";

/** 기본 제공 42개 Theme의 고정 displayCode 접두어. docs/PRODUCT_SPEC.md 2장 목록과 1:1 대응. */
export const DEFAULT_THEME_PREFIXES: Record<string, string> = {
  // 코딩
  SQL: "SQL",
  Python: "PY",
  자료구조: "DS",
  알고리즘: "ALGO",
  // 데이터
  데이터분석: "DA",
  통계: "STAT",
  "Product Analytics": "PA",
  "Business Analytics": "BA",
  "A/B Test": "AB",
  "데이터 시각화": "DV",
  // 금융
  금융기초: "FIN",
  은행: "BANK",
  카드: "CARD",
  "핀테크·결제": "PAY",
  "신용·여신": "CREDIT",
  "투자·증권": "INVEST",
  금융규제: "FINREG",
  // 비즈니스
  이커머스: "ECOM",
  플랫폼: "PLAT",
  비즈니스모델: "BIZ",
  "KPI·지표": "KPI",
  마케팅: "MKT",
  // CS·IT
  데이터베이스: "DB",
  네트워크: "NET",
  운영체제: "OS",
  "API·Web": "API",
  Cloud: "CLOUD",
  Git: "GIT",
  // AI
  ML: "ML",
  DL: "DL",
  LLM: "LLM",
  RAG: "RAG",
  "AI Agent": "AGENT",
  "AI 기초": "AIBASIC",
  // 취업
  NCS: "NCS",
  인적성: "APTI",
  면접: "INTV",
  직무지식: "JOB",
  // 언어
  영어: "ENG",
  OPIc: "OPIC",
  일본어: "JPN",
  스페인어: "ESP",
};

const RESERVED_PREFIXES = new Set(Object.values(DEFAULT_THEME_PREFIXES));

type CodeHolder = { displayCode?: string };
type ThemeLike = Pick<Theme, "id" | "name"> & { isCustom?: boolean };

/** 기본 제공 Theme(isCustom이 아니고 이름이 매핑에 있음)이면 고정 접두어, 아니면 null. */
export function getFixedThemePrefix(theme: ThemeLike): string | null {
  if (theme.isCustom) return null;
  return DEFAULT_THEME_PREFIXES[theme.name] ?? null;
}

/**
 * 다른 Theme을 고려하지 않은 Theme의 기본 접두어.
 * 1) 기본 제공 Theme이면 고정 매핑,
 * 2) 사용자 Theme은 이름의 ASCII 영숫자(최대 8자),
 * 3) ASCII가 전혀 없으면 CUSTOM.
 */
export function getThemePrefix(theme: ThemeLike): string {
  const fixed = getFixedThemePrefix(theme);
  if (fixed) return fixed;
  const ascii = theme.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CUSTOM_ASCII_MAX);
  return ascii.length > 0 ? ascii : CUSTOM_FALLBACK_PREFIX;
}

/** "PREFIX-0001" 에서 PREFIX를 뽑는다. 형식이 다르면 null. */
export function extractPrefix(code: string | undefined): string | null {
  const match = code?.match(/^([A-Z0-9]+)-(\d+)$/);
  return match ? match[1] : null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 다른 Theme과의 충돌까지 고려한 최종 접두어.
 * - 기본 제공 Theme: 고정 접두어.
 * - 사용자 Theme: 이미 자기 문제에 쓰고 있는 fallback 접두어(base 또는 base+숫자)가 있으면 그대로 유지해
 *   코드가 흔들리지 않게 하고, 없으면 기본 Theme 접두어와 takenByOthers를 피해 base, base2, base3... 순으로 고른다.
 */
export function resolveThemePrefix(
  theme: ThemeLike,
  existingInTheme: CodeHolder[],
  takenByOthers: Iterable<string> = [],
): string {
  const fixed = getFixedThemePrefix(theme);
  if (fixed) return fixed;

  const base = getThemePrefix(theme);
  const taken = new Set([...RESERVED_PREFIXES, ...takenByOthers]);
  const ownPattern = new RegExp(`^${escapeRegExp(base)}\\d*$`);

  const ownCounts = new Map<string, number>();
  for (const q of existingInTheme) {
    const p = extractPrefix(q.displayCode);
    if (p && ownPattern.test(p) && !taken.has(p)) ownCounts.set(p, (ownCounts.get(p) ?? 0) + 1);
  }
  if (ownCounts.size > 0) {
    return [...ownCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

function parseDisplayCodeNumber(code: string, prefix: string): number | null {
  const match = code.match(new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`));
  return match ? Number(match[1]) : null;
}

export function formatDisplayCode(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(DISPLAY_CODE_PAD, "0")}`;
}

/** prefix 기준으로 existing에서 가장 큰 번호 다음 코드를 만든다. */
export function nextDisplayCode(prefix: string, existingInTheme: CodeHolder[]): string {
  let max = 0;
  for (const q of existingInTheme) {
    const n = q.displayCode ? parseDisplayCodeNumber(q.displayCode, prefix) : null;
    if (n !== null) max = Math.max(max, n);
  }
  return formatDisplayCode(prefix, max + 1);
}

/**
 * 해당 Theme에 새로 추가될 문제의 displayCode를 만든다.
 * 같은 접두어를 가진 기존 코드 중 가장 큰 번호 다음 값을 사용해 "동일 Theme 내 중복 금지"를 보장한다.
 * takenByOthers: 다른 Theme이 이미 쓰는 접두어 (사용자 Theme fallback 충돌 방지용).
 */
export function generateDisplayCode(
  theme: ThemeLike,
  existingInTheme: CodeHolder[],
  takenByOthers: Iterable<string> = [],
): string {
  return nextDisplayCode(resolveThemePrefix(theme, existingInTheme, takenByOthers), existingInTheme);
}

interface RecodeQuestion {
  id: string;
  themeId: string;
  displayCode?: string;
  createdAt: number;
}

/**
 * 사용자 Theme의 displayCode를 현재 접두어 규칙에 맞게 정리할 때 바뀌어야 하는 항목만 계산한다 (DB 마이그레이션용).
 * - 기본 제공 Theme은 건드리지 않는다 (v3에서 고정 접두어로 정리됨).
 * - 사용자 Theme은 충돌 없는 접두어를 정하고, 접두어만 다른 코드는 번호를 유지한 채 접두어만 바꾼다.
 */
export function planCustomThemeRecode(
  themes: ThemeLike[],
  questions: RecodeQuestion[],
): { id: string; displayCode: string }[] {
  const byTheme = new Map<string, RecodeQuestion[]>();
  for (const q of questions) {
    const list = byTheme.get(q.themeId) ?? [];
    list.push(q);
    byTheme.set(q.themeId, list);
  }

  const taken = new Set<string>();
  const customThemes: ThemeLike[] = [];
  for (const theme of themes) {
    const fixed = getFixedThemePrefix(theme);
    if (fixed) taken.add(fixed);
    else customThemes.push(theme);
  }

  const updates: { id: string; displayCode: string }[] = [];
  for (const theme of customThemes) {
    const list = [...(byTheme.get(theme.id) ?? [])].sort((a, b) => a.createdAt - b.createdAt);
    const prefix = resolveThemePrefix(theme, list, taken);
    taken.add(prefix);

    const usedCodes = new Set(
      list.filter((q) => extractPrefix(q.displayCode) === prefix).map((q) => q.displayCode as string),
    );
    for (const q of list) {
      if (extractPrefix(q.displayCode) === prefix) continue;
      const num = q.displayCode?.match(/-(\d+)$/)?.[1];
      const candidate = num ? `${prefix}-${num}` : undefined;
      const code =
        candidate && !usedCodes.has(candidate)
          ? candidate
          : nextDisplayCode(prefix, [...usedCodes].map((displayCode) => ({ displayCode })));
      usedCodes.add(code);
      updates.push({ id: q.id, displayCode: code });
    }
  }
  return updates;
}
