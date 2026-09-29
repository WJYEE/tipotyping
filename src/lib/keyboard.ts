// Game Typing 전반의 Enter/키보드 처리 책임을 한 곳에 모은 순수 함수들.
// 실제 DOM/React KeyboardEvent는 각 컴포넌트에서 이 평범한 객체 형태로 변환해 넘긴다.
// (React 합성 이벤트에 직접 결합하지 않아 테스트가 쉽다)

export interface EnterKeyLike {
  key: string;
  /** IME(한글 등) 조합 확정을 위한 Enter인지 여부 — true면 절대 제출로 처리하지 않는다 */
  isComposing: boolean;
}

/** 일반 입력/빈칸: 이 Enter를 "제출" 의도로 볼 수 있는가 (IME 조합 중이면 false) */
export function isSubmitEnter(e: EnterKeyLike): boolean {
  return e.key === "Enter" && !e.isComposing;
}

export interface EssayEnterLike extends EnterKeyLike {
  ctrlOrMeta: boolean;
}

/** 서술형: Enter만 누르면 줄바꿈(false), Ctrl/Cmd+Enter여야만 제출(true) */
export function isEssaySubmitEnter(e: EssayEnterLike): boolean {
  return isSubmitEnter(e) && e.ctrlOrMeta;
}

export type GamePhase = "answering" | "feedback";

export interface AdvanceEnterContext extends EnterKeyLike {
  phase: GamePhase;
  /** Pause 중이면 false */
  running: boolean;
  /** document.activeElement?.tagName — 메모 등 텍스트 입력 중이면 전역 Enter를 가로채지 않는다 */
  focusedTag: string | null;
}

/**
 * Feedback 화면에서 "다음 문제로" 전역 Enter 리스너가 실제로 동작해야 하는지 판단한다.
 * - IME 조합 중이면 false
 * - feedback 단계가 아니거나 Pause 중이면 false (Pause/모달 상태에서 Enter 무시 요구사항)
 * - 포커스가 input/textarea(예: 개인 메모)에 있으면 false — 로컬 입력이 우선한다
 */
export function shouldAdvanceOnEnter(ctx: AdvanceEnterContext): boolean {
  if (!isSubmitEnter(ctx)) return false;
  if (ctx.phase !== "feedback" || !ctx.running) return false;
  if (ctx.focusedTag === "INPUT" || ctx.focusedTag === "TEXTAREA") return false;
  return true;
}
