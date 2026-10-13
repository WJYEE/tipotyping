import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { db } from "@/db/db";
import { PACKAGES, packagePath } from "@/lib/packages/definitions";

export function PackageSelectScreen() {
  const counts = useLiveQuery(async () => {
    const rows = await db.packageContentMap.toArray();
    const result: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const byKind = (result[r.packageId] ??= {});
      byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
    }
    return result;
  }, []);

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-8 px-6 py-10 md:px-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-2xl font-extrabold text-text-primary">학습 패키지</h1>
        <p className="font-body text-sm text-text-secondary">
          공간을 하나 골라 문제은행, 개념 정리, 실습 과제, 메모, 추천 사이트를 모아 보세요. 모든 패키지는 하나의 Tipo 안에서 동작합니다.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {PACKAGES.map((p) => {
          const c = counts?.[p.id] ?? {};
          const total = Object.values(c).reduce((a, b) => a + b, 0);
          return (
            <Link key={p.id} to={packagePath(p.id)} className="group block focus:outline-none">
              <Card
                emphasized
                className="flex h-full flex-col gap-3 transition-transform group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-accent"
              >
                <h2 className="font-display text-xl font-extrabold text-text-primary">{p.name}</h2>
                <p className="font-body text-sm text-text-secondary">{p.description}</p>
                <p className="mt-auto font-body text-xs text-text-muted">
                  {total === 0
                    ? p.id === "kb-bridge"
                      ? "콘텐츠를 가져오면 시작할 수 있어요"
                      : "아직 콘텐츠가 없어요 — 메모를 추가해 보세요"
                    : `문제 ${c.question ?? 0} · 개념 ${c.concept ?? 0} · 실습 ${c.task ?? 0} · 메모 ${c.memo ?? 0} · 사이트 ${c.resource ?? 0}`}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
