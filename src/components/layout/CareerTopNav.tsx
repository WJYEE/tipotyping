import { Link, useLocation, useNavigate } from "react-router-dom";
import { PlusIcon } from "@/components/ui/icons";

const CAREER_NAV_TABS: { path: string; label: string; disabled?: boolean }[] = [
  { path: "/career", label: "Dashboard" },
  { path: "/career/jd-library", label: "JD Library", disabled: true },
  { path: "/career/my-evidence", label: "My Evidence", disabled: true },
];

/** Career 서비스 영역 전용 상단 네비게이션. Learning의 TopNav와 별개 컴포넌트다(디자인 언어가 다름). */
export function CareerTopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="flex h-[72px] items-center justify-between border-b border-career-border-strong bg-career-surface px-11">
      <div className="flex items-center gap-8">
        <Link to="/career" className="flex items-center gap-3">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[6px] bg-career-purple">
            <span className="font-display text-lg text-white">T</span>
          </div>
          <span className="font-display text-xl text-career-text-primary">Tipo</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/career"
            className="rounded-pill bg-career-blue-soft px-3.5 py-2 font-body text-[13px] font-bold text-career-blue"
          >
            Career
          </Link>
          <Link
            to="/"
            className="rounded-pill px-3.5 py-2 font-body text-[13px] font-semibold text-career-purple"
          >
            Learning · TipoTyping
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-4">
          {CAREER_NAV_TABS.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                type="button"
                disabled={tab.disabled}
                onClick={() => !tab.disabled && navigate(tab.path)}
                className={`border-b-2 px-0 py-6 font-body text-sm ${
                  isActive
                    ? "border-career-blue font-bold text-career-text-primary"
                    : tab.disabled
                      ? "border-transparent text-career-text-muted"
                      : "border-transparent text-career-text-secondary hover:text-career-text-primary"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          disabled
          className="flex items-center gap-2 rounded-[6px] bg-career-text-primary px-4 py-2.5 font-body text-[13px] font-bold text-white opacity-60"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          JD 저장
        </button>

        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-career-table-header font-body text-xs font-bold text-career-text-primary">
          SY
        </span>
      </div>
    </header>
  );
}
