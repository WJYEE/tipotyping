import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { KbBridgeImportBanner } from "@/features/packages/KbBridgeImportBanner";
import { ConceptsTab } from "@/features/packages/tabs/ConceptsTab";
import { MemosTab } from "@/features/packages/tabs/MemosTab";
import { QuestionBankTab } from "@/features/packages/tabs/QuestionBankTab";
import { ResourcesTab } from "@/features/packages/tabs/ResourcesTab";
import { TasksTab } from "@/features/packages/tabs/TasksTab";
import { usePackageData } from "@/features/packages/usePackageData";
import { getPackage, isPackageTab, PACKAGE_TABS, packagePath, type PackageTabKey } from "@/lib/packages/definitions";
import { computeQuestionProgress, computeTaskProgress, percent } from "@/lib/packages/packageView";
import type { PackageId } from "@/types/package";

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-pill border border-border-strong bg-surface"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full bg-success" style={{ width: `${value}%` }} />
    </div>
  );
}

export function PackageScreen() {
  const { packageId, tab } = useParams();
  const pkg = getPackage(packageId);
  const [search, setSearch] = useSearchParams();

  if (!pkg) return <Navigate to="/packages" replace />;
  if (tab !== undefined && !isPackageTab(tab)) return <Navigate to={packagePath(pkg.id)} replace />;
  const activeTab: PackageTabKey = tab ?? "questions";
  const categoryKey = search.get("category") ?? "";
  const setCategoryKey = (key: string) => {
    const next = new URLSearchParams(search);
    if (key) next.set("category", key);
    else next.delete("category");
    setSearch(next, { replace: true });
  };

  return (
    <PackageBody
      packageId={pkg.id}
      name={pkg.name}
      description={pkg.description}
      activeTab={activeTab}
      categoryKey={categoryKey}
      onCategoryChange={setCategoryKey}
    />
  );
}

interface BodyProps {
  packageId: PackageId;
  name: string;
  description: string;
  activeTab: PackageTabKey;
  categoryKey: string;
  onCategoryChange: (key: string) => void;
}

function PackageBody({ packageId, name, description, activeTab, categoryKey, onCategoryChange }: BodyProps) {
  const data = usePackageData(packageId);
  const qp = computeQuestionProgress(data.questions, data.recordMap);
  const tp = computeTaskProgress(data.tasks);
  const qPercent = percent(qp.attempted, qp.total);

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-6 py-8 md:px-10">
      <div className="flex flex-col gap-1">
        <Link to="/packages" className="font-body text-xs font-semibold text-accent">
          ← 패키지 선택
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-text-primary">{name}</h1>
        <p className="font-body text-sm text-text-secondary">{description}</p>
      </div>

      {packageId === "kb-bridge" && <KbBridgeImportBanner />}

      {(qp.total > 0 || tp.total > 0) && (
        <Card className="grid gap-4 !p-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <p className="font-body text-xs font-semibold text-text-secondary">문제 풀이 진행률</p>
            <p className="font-display text-base font-extrabold text-text-primary">
              {qp.attempted} / {qp.total} 문항 ({qPercent}%)
              <span className="ml-2 font-body text-xs font-normal text-text-secondary">
                최근 정답 {qp.lastCorrect} · 오답 {qp.lastWrong}
              </span>
            </p>
            <ProgressBar value={qPercent} />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="font-body text-xs font-semibold text-text-secondary">실습 과제 완료</p>
            <p className="font-display text-base font-extrabold text-text-primary">
              {tp.done} / {tp.total} ({percent(tp.done, tp.total)}%)
            </p>
            <ProgressBar value={percent(tp.done, tp.total)} />
          </div>
        </Card>
      )}

      <nav className="flex flex-wrap gap-2" aria-label="패키지 메뉴">
        {PACKAGE_TABS.map((t) => {
          const active = t.key === activeTab;
          return (
            <Link
              key={t.key}
              to={{ pathname: packagePath(packageId, t.key), search: categoryKey ? `?category=${categoryKey}` : "" }}
              aria-current={active ? "page" : undefined}
              className={`rounded-pill border-2 px-4 py-2 font-display text-sm ${
                active
                  ? "border-border-strong bg-accent-soft font-bold text-text-primary"
                  : "border-transparent font-medium text-text-secondary hover:text-text-primary"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {!data.loaded ? (
        <p className="font-body text-sm text-text-secondary">불러오는 중…</p>
      ) : (
        <>
          {activeTab === "questions" && (
            <QuestionBankTab packageId={packageId} data={data} categoryKey={categoryKey} onCategoryChange={onCategoryChange} />
          )}
          {activeTab === "concepts" && (
            <ConceptsTab packageId={packageId} data={data} categoryKey={categoryKey} onCategoryChange={onCategoryChange} />
          )}
          {activeTab === "tasks" && <TasksTab data={data} categoryKey={categoryKey} onCategoryChange={onCategoryChange} />}
          {activeTab === "memos" && <MemosTab packageId={packageId} data={data} />}
          {activeTab === "resources" && <ResourcesTab data={data} />}
        </>
      )}
      {data.loaded && qp.total === 0 && data.concepts.length === 0 && data.memos.length === 0 && packageId !== "kb-bridge" && (
        <Badge tone="warning">이 패키지에는 아직 문제·개념이 없습니다. 메모 탭에서 직접 추가할 수 있어요.</Badge>
      )}
    </div>
  );
}
