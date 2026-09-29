import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/icons";

// 화면 라우팅이 아직 없어 nav-tab은 시각적 요소로만 구현하고 "Home"만 active로 고정한다.
// (React Router 도입 시 실제 네비게이션으로 교체)
const NAV_TABS = ["Home", "Play", "Questions", "Records"] as const;

export function TopNav() {
  return (
    <header className="flex h-[72px] items-center justify-between border-b-2 border-border-strong bg-surface px-10">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-icon border-2 border-border-strong bg-accent">
          <span className="font-display text-lg font-extrabold text-text-primary">T</span>
        </div>
        <span className="font-display text-[22px] font-extrabold text-text-primary">
          TipoTyping
        </span>
      </div>

      <div className="flex items-center gap-8">
        <nav className="flex items-center gap-4">
          {NAV_TABS.map((tab) => (
            <span
              key={tab}
              className={`rounded-pill px-4 py-2 font-display text-[15px] ${
                tab === "Home"
                  ? "border-2 border-border-strong bg-accent-soft font-bold text-text-primary"
                  : "font-medium text-text-secondary"
              }`}
            >
              {tab}
            </span>
          ))}
        </nav>
        <Button variant="success" className="!px-4 !py-2 font-body text-sm font-bold">
          <PlusIcon className="h-3.5 w-3.5" />
          문제 추가
        </Button>
      </div>
    </header>
  );
}
