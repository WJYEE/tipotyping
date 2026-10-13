import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { packageRepo } from "@/db/repositories";
import { CategoryChips, SearchBox, type CategoryChip } from "@/features/packages/CategoryChips";
import type { PackageData } from "@/features/packages/usePackageData";

interface Props {
  data: PackageData;
  categoryKey: string;
  onCategoryChange: (key: string) => void;
}

/** 실습 과제 목록. 자동 코드 채점·파일 제출은 없고, 사용자가 스스로 완료 표시만 한다. */
export function TasksTab({ data, categoryKey, onCategoryChange }: Props) {
  const [search, setSearch] = useState("");

  if (data.tasks.length === 0) {
    return <Card className="font-body text-sm text-text-secondary">이 패키지에는 아직 실습 과제가 없습니다.</Card>;
  }

  const chips: CategoryChip[] = data.categories
    .filter((c) => data.tasks.some((t) => t.categoryKey === c.key))
    .map((c) => {
      const inCat = data.tasks.filter((t) => t.categoryKey === c.key);
      return { key: c.key, label: c.name, hint: `${inCat.filter((t) => t.completedAt !== null).length}/${inCat.length}` };
    });
  const needle = search.trim().toLowerCase();
  const visible = data.tasks.filter(
    (t) =>
      (!categoryKey || t.categoryKey === categoryKey) &&
      (!needle || `${t.title} ${t.task} ${t.tools}`.toLowerCase().includes(needle)),
  );

  return (
    <div className="flex flex-col gap-4">
      <CategoryChips chips={chips} value={categoryKey} onChange={onCategoryChange} />
      <SearchBox value={search} onChange={setSearch} placeholder="실습 과제 검색" />
      <p className="font-body text-xs text-text-secondary">
        실습 결과는 직접 확인하세요. 이 앱은 코드를 실행하거나 파일을 채점하지 않으며, 완료 표시만 저장합니다.
      </p>
      {visible.length === 0 ? (
        <Card className="font-body text-sm text-text-secondary">조건에 맞는 실습 과제가 없습니다.</Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((t) => {
            const done = t.completedAt !== null;
            const catName = data.categories.find((c) => c.key === t.categoryKey)?.name ?? t.categoryKey;
            return (
              <li key={t.id}>
                <Card className={`flex h-full flex-col gap-2 !p-4 ${done ? "bg-success-soft" : ""}`}>
                  <p className="font-body text-xs text-text-secondary">
                    {t.id.replace(/^kbb-/, "")} · {catName} · {t.tools}
                  </p>
                  <h3 className="font-display text-base font-extrabold text-text-primary">{t.title}</h3>
                  <p className="font-body text-sm text-text-primary">{t.task}</p>
                  {t.evaluation.length > 0 && (
                    <div>
                      <p className="font-body text-xs font-bold text-text-secondary">평가 기준</p>
                      <ul className="list-disc pl-5 font-body text-sm text-text-primary">
                        {t.evaluation.map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <label className="mt-auto flex items-center gap-2 pt-2 font-body text-sm font-semibold text-text-primary">
                    <input type="checkbox" checked={done} onChange={(e) => void packageRepo.setTaskCompleted(t.id, e.target.checked)} />
                    완료 표시
                  </label>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
