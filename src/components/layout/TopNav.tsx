import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/icons";

const NAV_TABS: { path: string; label: string; disabled?: boolean }[] = [
  { path: "/", label: "Home" },
  { path: "/play", label: "Play" },
  { path: "/questions", label: "Questions" },
  { path: "/records", label: "Records", disabled: true },
];

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="flex h-[72px] items-center justify-between border-b-2 border-border-strong bg-surface px-10">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-icon border-2 border-border-strong bg-accent">
            <span className="font-display text-lg font-extrabold text-text-primary">T</span>
          </div>
          <span className="font-display text-[22px] font-extrabold text-text-primary">
            TipoTyping
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="rounded-pill border-2 border-border-strong bg-accent-soft px-3.5 py-1.5 font-body text-[13px] font-bold text-text-primary">
            Learning
          </span>
          <Link
            to="/career"
            className="rounded-pill px-3.5 py-1.5 font-body text-[13px] font-semibold text-text-secondary hover:text-text-primary"
          >
            Career
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <nav className="flex items-center gap-4">
          {NAV_TABS.map((tab) => {
            const isActive = tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                type="button"
                disabled={tab.disabled}
                onClick={() => !tab.disabled && navigate(tab.path)}
                className={`rounded-pill px-4 py-2 font-display text-[15px] ${
                  isActive
                    ? "border-2 border-border-strong bg-accent-soft font-bold text-text-primary"
                    : tab.disabled
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
          onClick={() => navigate("/questions")}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          문제 추가
        </Button>
      </div>
    </header>
  );
}
