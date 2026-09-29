import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/icons";

export type NavView = "home" | "theme-selection" | "question-management";

// "Records"(기록실)는 이번 단계 범위 밖이라 비활성으로 둔다.
const NAV_TABS: { key: NavView | "records"; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "theme-selection", label: "Play" },
  { key: "question-management", label: "Questions" },
  { key: "records", label: "Records" },
];

interface TopNavProps {
  active: NavView;
  onNavigate: (view: NavView) => void;
}

export function TopNav({ active, onNavigate }: TopNavProps) {
  return (
    <header className="flex h-[72px] items-center justify-between border-b-2 border-border-strong bg-surface px-10">
      <button
        type="button"
        onClick={() => onNavigate("home")}
        className="flex items-center gap-3"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-icon border-2 border-border-strong bg-accent">
          <span className="font-display text-lg font-extrabold text-text-primary">T</span>
        </div>
        <span className="font-display text-[22px] font-extrabold text-text-primary">
          TipoTyping
        </span>
      </button>

      <div className="flex items-center gap-8">
        <nav className="flex items-center gap-4">
          {NAV_TABS.map((tab) => {
            const isActive = tab.key === active;
            const disabled = tab.key === "records";
            return (
              <button
                key={tab.key}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onNavigate(tab.key as NavView)}
                className={`rounded-pill px-4 py-2 font-display text-[15px] ${
                  isActive
                    ? "border-2 border-border-strong bg-accent-soft font-bold text-text-primary"
                    : disabled
                      ? "font-medium text-text-muted"
                      : "font-medium text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
        <Button
          variant="success"
          className="!px-4 !py-2 font-body text-sm font-bold"
          onClick={() => onNavigate("question-management")}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          문제 추가
        </Button>
      </div>
    </header>
  );
}
