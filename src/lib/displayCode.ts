// 사용자 노출용 Question displayCode (예: SQL-0001) 생성 로직.
// 기본 제공 Theme은 사람이 읽을 수 있는 고정 접두어를 쓰고, 사용자가 추가한 Theme만
// (ASCII 추출 → 실패 시 theme id 기반) 안전한 fallback을 사용한다.
import type { Question, Theme } from "@/types/domain";

const DISPLAY_CODE_PAD = 4;

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

/**
 * Theme의 displayCode 접두어를 정한다.
 * 1) 기본 제공 Theme이면 고정 매핑을 그대로 쓴다.
 * 2) 사용자가 추가한 Theme은 이름에서 ASCII 영숫자를 뽑아 쓰고,
 * 3) ASCII가 전혀 없으면(예: 순한글 이름) theme id 기반 코드로 대체한다.
 */
export function getThemePrefix(theme: Pick<Theme, "id" | "name">): string {
  const fixed = DEFAULT_THEME_PREFIXES[theme.name];
  if (fixed) return fixed;

  const ascii = theme.name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (ascii.length > 0) return ascii.slice(0, 10);
  return theme.id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

/** prefix-0001 형태에서 prefix와 번호를 분리한다. */
function parseDisplayCode(code: string, prefix: string): number | null {
  const match = code.match(new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`));
  return match ? Number(match[1]) : null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 해당 Theme에 새로 추가될 문제의 displayCode를 만든다.
 * 같은 접두어를 가진 기존 코드 중 가장 큰 번호 다음 값을 사용해 "동일 Theme 내 중복 금지"를 보장한다.
 */
export function generateDisplayCode(
  theme: Pick<Theme, "id" | "name">,
  existingInTheme: Pick<Question, "displayCode">[],
): string {
  const prefix = getThemePrefix(theme);
  let max = 0;
  for (const q of existingInTheme) {
    const n = q.displayCode ? parseDisplayCode(q.displayCode, prefix) : null;
    if (n !== null) max = Math.max(max, n);
  }
  return `${prefix}-${String(max + 1).padStart(DISPLAY_CODE_PAD, "0")}`;
}
