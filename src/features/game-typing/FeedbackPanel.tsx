import { Badge } from "@/components/ui/Badge";

interface FeedbackPanelProps {
  isCorrect: boolean;
  displayCode: string;
  questionText: string;
  userAnswerText: string;
  correctAnswerText: string;
  explanation?: string;
}

export function FeedbackPanel({
  isCorrect,
  displayCode,
  questionText,
  userAnswerText,
  correctAnswerText,
  explanation,
}: FeedbackPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Badge tone={isCorrect ? "success" : "danger"} className="w-fit text-sm">
          {isCorrect ? "정답" : "오답"}
        </Badge>
        <span className="rounded-badge border border-border px-1.5 py-0.5 font-mono text-[11px] font-semibold text-text-secondary">
          {displayCode}
        </span>
      </div>
      <p className="whitespace-pre-wrap font-display text-xl font-bold text-text-primary">
        {questionText}
      </p>
      <p className="font-body text-sm text-text-secondary">
        내가 입력한 답: <span className="font-semibold text-text-primary">{userAnswerText}</span>
      </p>
      <p className="font-body text-sm text-text-secondary">
        실제 정답: <span className="font-semibold text-text-primary">{correctAnswerText}</span>
      </p>
      {explanation && <p className="font-body text-sm text-text-secondary">{explanation}</p>}
      <p className="font-body text-xs text-text-muted">Enter를 누르면 다음 문제로 넘어갑니다.</p>
    </div>
  );
}
