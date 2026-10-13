import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { CategoryChips, SearchBox, type CategoryChip } from "@/features/packages/CategoryChips";
import type { PackageData } from "@/features/packages/usePackageData";
import { isHttpUrl } from "@/lib/packages/url";

/** 추천 사이트. 카테고리 라벨은 데이터에서 모으므로 새 사이트/카테고리를 추가해도 화면 코드는 바뀌지 않는다. */
export function ResourcesTab({ data }: { data: PackageData }) {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  if (data.resources.length === 0) {
    return <Card className="font-body text-sm text-text-secondary">이 패키지에는 아직 추천 사이트가 없습니다.</Card>;
  }

  const labels = [...new Set(data.resources.map((r) => r.category))];
  const chips: CategoryChip[] = labels.map((l) => ({
    key: l,
    label: l,
    count: data.resources.filter((r) => r.category === l).length,
  }));
  const needle = search.trim().toLowerCase();
  const visible = data.resources.filter(
    (r) =>
      (!category || r.category === category) &&
      (!needle || `${r.title} ${r.whenToUse} ${r.category}`.toLowerCase().includes(needle)),
  );

  return (
    <div className="flex flex-col gap-4">
      <CategoryChips chips={chips} value={category} onChange={setCategory} />
      <SearchBox value={search} onChange={setSearch} placeholder="사이트 이름·활용 목적 검색" />
      <p className="font-body text-xs text-text-secondary">
        외부 링크의 유효성과 최신성은 확인되지 않았습니다. 외부 사이트의 문제나 자료를 복제하지 마세요.
      </p>
      {visible.length === 0 ? (
        <Card className="font-body text-sm text-text-secondary">조건에 맞는 사이트가 없습니다.</Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((r) => (
            <li key={r.id}>
              <Card className="flex h-full flex-col gap-1.5 !p-4">
                <p className="font-body text-xs text-text-secondary">{r.category}</p>
                {isHttpUrl(r.url) ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-base font-extrabold text-accent underline-offset-2 hover:underline"
                  >
                    {r.title} ↗
                  </a>
                ) : (
                  <span className="font-display text-base font-extrabold text-text-primary">{r.title}</span>
                )}
                {r.whenToUse && <p className="font-body text-sm text-text-primary">언제 쓰나요? {r.whenToUse}</p>}
                {r.verification && <p className="font-body text-xs text-text-muted">{r.verification}</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
