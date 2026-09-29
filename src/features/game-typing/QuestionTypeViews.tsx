import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { isEssaySubmitEnter, isSubmitEnter } from "@/lib/keyboard";
import type { BlankPayload, MultipleChoicePayload } from "@/types/domain";

const inputClass =
  "w-full rounded-badge border-2 border-border bg-surface px-4 py-3 font-body text-base text-text-primary outline-none focus:border-accent";

/** React KeyboardEvent → 순수 판별 함수가 받는 평범한 형태로 변환 */
function toEnterKey(e: KeyboardEvent<HTMLElement>) {
  return { key: e.key, isComposing: e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229 };
}

interface SingleInputViewProps {
  label: string;
  text: string;
  onSubmit: (value: string) => void;
}

/** term-to-def / def-to-term / answer-input 공통: 한 줄 입력, Enter=제출(IME 조합 중 제외) */
export function SingleInputView({ label, text, onSubmit }: SingleInputViewProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [text]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isSubmitEnter(toEnterKey(e))) return;
    e.preventDefault();
    e.stopPropagation();
    onSubmit(value);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-body text-xs font-semibold text-text-secondary">{label}</p>
        <p className="whitespace-pre-wrap font-display text-xl font-bold text-text-primary">{text}</p>
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={inputClass}
        placeholder="정답 입력 후 Enter"
      />
    </div>
  );
}

/** 서술형: Enter=줄바꿈(기본 동작 그대로 둠), Ctrl/Cmd+Enter=제출 */
export function EssayView({ prompt, onSubmit }: { prompt: string; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [prompt]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    const isSubmit = isEssaySubmitEnter({ ...toEnterKey(e), ctrlOrMeta: e.ctrlKey || e.metaKey });
    if (!isSubmit) return; // 일반 Enter는 막지 않는다 → textarea 기본 동작(줄바꿈) 유지
    e.preventDefault();
    e.stopPropagation();
    onSubmit(value);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="whitespace-pre-wrap font-display text-xl font-bold text-text-primary">{prompt}</p>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`${inputClass} min-h-32`}
        placeholder="서술형 답안 입력 (Ctrl+Enter로 제출)"
      />
      <button
        type="button"
        onClick={() => onSubmit(value)}
        className="self-end rounded-pill border-2 border-border-strong bg-success px-6 py-2 font-body text-sm font-bold text-text-primary"
      >
        제출
      </button>
    </div>
  );
}

/** 객관식: 숫자키 또는 클릭 즉시 제출 */
export function MultipleChoiceView({
  payload,
  onSubmit,
}: {
  payload: MultipleChoicePayload;
  onSubmit: (value: string) => void;
}) {
  useEffect(() => {
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.isComposing) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= payload.options.length) {
        onSubmit(String(n - 1));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [payload, onSubmit]);

  return (
    <div className="flex flex-col gap-4">
      <p className="whitespace-pre-wrap font-display text-xl font-bold text-text-primary">
        {payload.prompt}
      </p>
      <div className="flex flex-col gap-2">
        {payload.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSubmit(String(i))}
            className="flex items-center gap-3 rounded-badge border-2 border-border bg-surface px-4 py-3 text-left font-body text-base text-text-primary hover:border-accent"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-badge border border-border-strong font-body text-xs font-bold">
              {i + 1}
            </span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 빈칸 블록: {{blankId}} 자리마다 순서대로 입력받는다.
 * 각 빈칸 Enter 시 즉시 채점해 틀리면 정답을 보여주고 다음 빈칸으로 넘어간다.
 * 마지막 빈칸까지 끝나면 onComplete로 전체 답안을 넘긴다.
 */
export function BlankQuestionView({
  payload,
  onComplete,
}: {
  payload: BlankPayload;
  onComplete: (answers: Record<string, string>) => void;
}) {
  const [blankIndex, setBlankIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, { value: string; correct: boolean }>>({});
  const [current, setCurrent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [blankIndex]);

  const parts = payload.template.split(/(\{\{.*?\}\})/g);

  function submitCurrentBlank() {
    const blank = payload.blanks[blankIndex];
    const isCorrect = current === blank.answer;
    const nextAnswers = { ...answers, [blank.id]: current };
    setAnswers(nextAnswers);
    setRevealed((prev) => ({ ...prev, [blank.id]: { value: blank.answer, correct: isCorrect } }));
    setCurrent("");

    if (blankIndex + 1 < payload.blanks.length) {
      setBlankIndex(blankIndex + 1);
    } else {
      onComplete(nextAnswers);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isSubmitEnter(toEnterKey(e))) return;
    e.preventDefault();
    e.stopPropagation();
    submitCurrentBlank();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="whitespace-pre-wrap font-mono text-lg text-text-primary">
        {parts.map((part, i) => {
          const match = part.match(/^\{\{(.*?)\}\}$/);
          if (!match) return <span key={i}>{part}</span>;
          const blankId = match[1];
          const blankPos = payload.blanks.findIndex((b) => b.id === blankId);
          const done = revealed[blankId];
          if (done) {
            return (
              <span
                key={i}
                className={`mx-1 rounded-badge border px-2 py-0.5 font-bold ${
                  done.correct ? "border-success bg-success-soft" : "border-danger bg-danger-soft"
                }`}
              >
                {done.value}
              </span>
            );
          }
          if (blankPos === blankIndex) {
            return (
              <span key={i} className="mx-1 inline-block">
                <input
                  ref={inputRef}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-32 rounded-badge border-2 border-accent bg-surface px-2 py-1 font-mono text-base text-text-primary outline-none"
                />
              </span>
            );
          }
          return (
            <span key={i} className="mx-1 rounded-badge border border-dashed border-border px-2 py-0.5">
              ___
            </span>
          );
        })}
      </p>
      <p className="font-body text-xs text-text-secondary">
        빈칸 {blankIndex + 1} / {payload.blanks.length} — Enter로 제출
      </p>
    </div>
  );
}
