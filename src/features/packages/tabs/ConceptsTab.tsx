import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CategoryChips, type CategoryChip } from "@/features/packages/CategoryChips";
import { MarkdownText } from "@/features/packages/MarkdownText";
import { categoryKeyOfQuestion, type PackageData } from "@/features/packages/usePackageData";
import { packagePath } from "@/lib/packages/definitions";
import type { PackageId } from "@/types/package";

interface Props {
  packageId: PackageId;
  data: PackageData;
  categoryKey: string;
  onCategoryChange: (key: string) => void;
}

export function ConceptsTab({ packageId, data, categoryKey, onCategoryChange }: Props) {
  if (data.concepts.length === 0) {
    return (
      <Card className="font-body text-sm text-text-secondary">
        {packageId === "kb-bridge"
          ? "개념 정리가 아직 없습니다. 위의 \"콘텐츠 가져오기\"를 눌러 불러오세요."
          : "이 패키지에는 아직 개념 정리가 없습니다."}
      </Card>
    );
  }

  const nameOf = (key: string) => data.categories.find((c) => c.key === key)?.name ?? key;
  const chips: CategoryChip[] = data.categories
    .filter((c) => data.concepts.some((n) => n.categoryKey === c.key))
    .map((c) => ({ key: c.key, label: c.name }));
  const visible = categoryKey ? data.concepts.filter((n) => n.categoryKey === categoryKey) : data.concepts;
  const ordered = [...visible].sort(
    (a, b) =>
      data.categories.findIndex((c) => c.key === a.categoryKey) - data.categories.findIndex((c) => c.key === b.categoryKey),
  );

  return (
    <div className="flex flex-col gap-4">
      <CategoryChips chips={chips} value={categoryKey} onChange={onCategoryChange} />
      <ul className="flex flex-col gap-4">
        {ordered.map((note) => {
          const questionCount = data.questions.filter((q) => categoryKeyOfQuestion(q) === note.categoryKey).length;
          const derivedCount = data.derived.filter((d) => d.categoryKey === note.categoryKey).length;
          const taskCount = data.tasks.filter((t) => t.categoryKey === note.categoryKey).length;
          return (
            <li key={note.id}>
              <Card className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-extrabold text-text-primary">{note.title}</h2>
                  {note.reviewStatus === "needs_human_review" && <Badge tone="danger">검수 전 초안</Badge>}
                </div>
                {categoryKey ? (
                  <MarkdownText source={note.body} />
                ) : (
                  <details>
                    <summary className="cursor-pointer font-body text-sm text-text-secondary">
                      {note.summary ?? "전체 보기"}
                    </summary>
                    <MarkdownText source={note.body} className="mt-3" />
                  </details>
                )}
                <div className="flex flex-wrap gap-4 border-t border-border pt-3 font-body text-xs font-semibold text-accent">
                  <Link to={{ pathname: packagePath(packageId, "questions"), search: `?category=${note.categoryKey}` }}>
                    {nameOf(note.categoryKey)} 문제 {questionCount}개 풀기 →
                  </Link>
                  <span className="font-normal text-text-secondary">파생질문 {derivedCount}개 (문제 상세에서 확인)</span>
                  {taskCount > 0 && (
                    <Link to={{ pathname: packagePath(packageId, "tasks"), search: `?category=${note.categoryKey}` }}>
                      실습 과제 {taskCount}개 →
                    </Link>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
