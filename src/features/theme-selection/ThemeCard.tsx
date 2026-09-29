import { Card } from "@/components/ui/Card";
import { IconPlate } from "@/components/ui/IconPlate";
import { EditIcon, FileCodeIcon, TrashIcon } from "@/components/ui/icons";
import type { Theme } from "@/types/domain";

interface ThemeCardProps {
  theme: Theme;
  questionCount: number;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ThemeCard({
  theme,
  questionCount,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: ThemeCardProps) {
  return (
    <Card
      className={`relative flex w-[140px] flex-col items-center gap-3 !p-4 text-center transition-colors ${
        selected ? "bg-accent-soft" : ""
      }`}
    >
      <div className="absolute right-2 top-2 flex gap-1">
        <button
          type="button"
          aria-label={`${theme.name} 수정`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex h-6 w-6 items-center justify-center rounded-badge border border-border-strong bg-surface text-text-secondary hover:text-text-primary"
        >
          <EditIcon className="h-3 w-3" />
        </button>
        <button
          type="button"
          aria-label={`${theme.name} 삭제`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-6 w-6 items-center justify-center rounded-badge border border-border-strong bg-surface text-text-secondary hover:text-danger"
        >
          <TrashIcon className="h-3 w-3" />
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleSelect}
        className="flex w-full flex-col items-center gap-3 pt-4"
      >
        <IconPlate tone={selected ? "accent" : "success"}>
          <FileCodeIcon className="h-[18px] w-[18px] text-text-primary" />
        </IconPlate>
        <div className="flex flex-col gap-1">
          <p className="font-display text-base font-extrabold text-text-primary">{theme.name}</p>
          <p className="font-body text-xs text-text-secondary">문제 {questionCount}개</p>
        </div>
      </button>
    </Card>
  );
}
