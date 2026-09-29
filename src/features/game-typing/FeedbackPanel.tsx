import { Badge } from "@/components/ui/Badge";

interface FeedbackPanelProps {
  isCorrect: boolean;
  correctAnswerText: string;
  explanation?: string;
}

export function FeedbackPanel({ isCorrect, correctAnswerText, explanation }: FeedbackPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <Badge tone={isCorrect ? "success" : "danger"} className="w-fit text-sm">
        {isCorrect ? "정답" : "오답"}
      </Badge>
      <p className="font-body text-sm text-text-secondary">
        실제 정답: <span className="font-semibold text-text-primary">{correctAnswerText}</span>
      </p>
      {explanation && <p className="font-body text-sm text-text-secondary">{explanation}</p>}
      <p className="font-body text-xs text-text-muted">Enter를 누르면 다음 문제로 넘어갑니다.</p>
    </div>
  );
}
