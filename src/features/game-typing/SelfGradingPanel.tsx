interface SelfGradingPanelProps {
  userAnswer: string;
  correctAnswerText: string;
  explanation?: string;
  onGrade: (isCorrect: boolean) => void;
}

/** 서술형 전용: 자동 채점 대신 사용자가 직접 맞았는지 판단한다. */
export function SelfGradingPanel({
  userAnswer,
  correctAnswerText,
  explanation,
  onGrade,
}: SelfGradingPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-body text-xs font-semibold text-text-secondary">내 답변</p>
        <p className="whitespace-pre-wrap font-body text-sm text-text-primary">{userAnswer}</p>
      </div>
      <div>
        <p className="font-body text-xs font-semibold text-text-secondary">모범답안</p>
        <p className="whitespace-pre-wrap font-body text-sm font-semibold text-text-primary">
          {correctAnswerText}
        </p>
      </div>
      {explanation && <p className="font-body text-sm text-text-secondary">{explanation}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onGrade(false)}
          className="rounded-pill border-2 border-border-strong bg-danger-soft px-6 py-2 font-body text-sm font-bold text-text-primary"
        >
          틀렸어요
        </button>
        <button
          type="button"
          onClick={() => onGrade(true)}
          className="rounded-pill border-2 border-border-strong bg-success px-6 py-2 font-body text-sm font-bold text-text-primary"
        >
          맞았어요
        </button>
      </div>
    </div>
  );
}
