import { Badge } from "@/components/ui/Badge";
import { EditIcon, FlagIcon, StarIcon, TrashIcon } from "@/components/ui/icons";
import { QUESTION_TYPE_LABELS, getQuestionSummary } from "@/lib/questionSummary";
import type { Question, Tag, Theme } from "@/types/domain";

interface QuestionRowProps {
  question: Question;
  theme?: Theme;
  tags: Tag[];
  onEdit: () => void;
  onDelete: () => void;
}

export function QuestionRow({ question, theme, tags, onEdit, onDelete }: QuestionRowProps) {
  const questionTags = question.tagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => !!t);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-badge border border-border px-1.5 py-0.5 font-mono text-[11px] font-semibold text-text-secondary">
            {question.displayCode}
          </span>
          <Badge tone="accent">{QUESTION_TYPE_LABELS[question.type]}</Badge>
          <span className="font-body text-xs text-text-secondary">{theme?.name ?? "삭제된 테마"}</span>
          {question.favorite && <StarIcon filled className="h-3.5 w-3.5 text-warning" />}
          {question.flagged && <FlagIcon className="h-3.5 w-3.5 text-danger" />}
        </div>
        <p className="truncate font-body text-sm text-text-primary">{getQuestionSummary(question)}</p>
        {questionTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {questionTags.map((t) => (
              <span key={t.id} className="font-body text-xs text-text-secondary">
                #{t.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="수정"
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-badge border border-border text-text-secondary hover:text-text-primary"
        >
          <EditIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="삭제"
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-badge border border-border text-text-secondary hover:text-danger"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
