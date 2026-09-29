import { describe, expect, it } from "vitest";
import { isEssaySubmitEnter, isSubmitEnter, shouldAdvanceOnEnter } from "@/lib/keyboard";

describe("isSubmitEnter", () => {
  it("Enter이고 IME 조합 중이 아니면 true", () => {
    expect(isSubmitEnter({ key: "Enter", isComposing: false })).toBe(true);
  });

  it("IME 조합 확정용 Enter는 제출로 보지 않는다", () => {
    expect(isSubmitEnter({ key: "Enter", isComposing: true })).toBe(false);
  });

  it("Enter가 아닌 키는 false", () => {
    expect(isSubmitEnter({ key: "a", isComposing: false })).toBe(false);
  });
});

describe("isEssaySubmitEnter", () => {
  it("Ctrl/Cmd 없이 Enter만 누르면 제출이 아니다 (줄바꿈)", () => {
    expect(isEssaySubmitEnter({ key: "Enter", isComposing: false, ctrlOrMeta: false })).toBe(false);
  });

  it("Ctrl+Enter는 제출이다", () => {
    expect(isEssaySubmitEnter({ key: "Enter", isComposing: false, ctrlOrMeta: true })).toBe(true);
  });

  it("IME 조합 중에는 Ctrl+Enter여도 제출로 처리하지 않는다", () => {
    expect(isEssaySubmitEnter({ key: "Enter", isComposing: true, ctrlOrMeta: true })).toBe(false);
  });
});

describe("shouldAdvanceOnEnter", () => {
  const base = { key: "Enter", isComposing: false, phase: "feedback" as const, running: true, focusedTag: null };

  it("feedback 단계 + running이면 다음 문제로 진행한다", () => {
    expect(shouldAdvanceOnEnter(base)).toBe(true);
  });

  it("answering 단계에서는 전역 Enter로 진행하지 않는다 (입력창이 직접 처리)", () => {
    expect(shouldAdvanceOnEnter({ ...base, phase: "answering" })).toBe(false);
  });

  it("Pause 중에는 Enter가 다음 문제로 진행시키지 않는다", () => {
    expect(shouldAdvanceOnEnter({ ...base, running: false })).toBe(false);
  });

  it("IME 조합 중에는 진행하지 않는다", () => {
    expect(shouldAdvanceOnEnter({ ...base, isComposing: true })).toBe(false);
  });

  it("포커스가 textarea(예: 개인 메모)에 있으면 전역 Enter를 가로채지 않는다", () => {
    expect(shouldAdvanceOnEnter({ ...base, focusedTag: "TEXTAREA" })).toBe(false);
  });

  it("포커스가 input에 있어도 가로채지 않는다", () => {
    expect(shouldAdvanceOnEnter({ ...base, focusedTag: "INPUT" })).toBe(false);
  });

  it("Enter가 아닌 키는 무시한다", () => {
    expect(shouldAdvanceOnEnter({ ...base, key: "a" })).toBe(false);
  });
});
