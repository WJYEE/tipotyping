import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlusIcon } from "@/components/ui/icons";
import { categoryRepo, questionRepo, tagRepo, themeRepo } from "@/db/repositories";
import { getQuestionSummary } from "@/lib/questionSummary";
import type { Question } from "@/types/domain";
import { ImportPanel } from "@/features/question-management/ImportPanel";
import { EMPTY_FILTERS, QuestionFilters, type QuestionFilterState } from "@/features/question-management/QuestionFilters";
import { QuestionForm } from "@/features/question-management/QuestionForm";
import { QuestionRow } from "@/features/question-management/QuestionRow";

export function QuestionManagementScreen() {
  const categories = useLiveQuery(() => categoryRepo.list(), []) ?? [];
  const themes = useLiveQuery(() => themeRepo.list(), []) ?? [];
  const tags = useLiveQuery(() => tagRepo.list(), []) ?? [];
  const questions = useLiveQuery(() => questionRepo.list(), []) ?? [];

  const [filters, setFilters] = useState<QuestionFilterState>(EMPTY_FILTERS);
  const [editing, setEditing] = useState<Question | "new" | null>(null);

  const filtered = questions.filter((q) => {
    if (filters.categoryId && q.categoryId !== filters.categoryId) return false;
    if (filters.themeId && q.themeId !== filters.themeId) return false;
    if (filters.tagId && !q.tagIds.includes(filters.tagId)) return false;
    if (filters.type && q.type !== filters.type) return false;
    if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
    if (filters.onlyFlagged && !q.flagged) return false;
    if (filters.onlyFavorite && !q.favorite) return false;
    if (filters.search && !getQuestionSummary(q).toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  async function handleDelete(question: Question) {
    if (!confirm("이 문제를 삭제할까요? 관련 학습 기록도 함께 삭제됩니다.")) return;
    await questionRepo.remove(question.id);
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 py-10 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-2xl font-extrabold text-text-primary">🗂️ 문제 보관함</h1>
          <p className="font-body text-sm text-text-secondary">
            테마별 문제를 검색·관리하고 새 문제를 추가하세요. (총 {questions.length}개)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportPanel />
          <Button
            variant="primary"
            className="!px-4 !py-2 text-sm"
            onClick={() => setEditing("new")}
          >
            <PlusIcon className="h-4 w-4" />
            문제 추가
          </Button>
        </div>
      </div>

      <Card>
        <QuestionFilters value={filters} onChange={setFilters} categories={categories} themes={themes} tags={tags} />
      </Card>

      <Card className="!p-0">
        {filtered.length === 0 ? (
          <p className="py-10 text-center font-body text-sm text-text-secondary">
            조건에 맞는 문제가 없습니다.
          </p>
        ) : (
          <div className="flex flex-col">
            {filtered.map((q) => (
              <QuestionRow
                key={q.id}
                question={q}
                theme={themes.find((t) => t.id === q.themeId)}
                tags={tags}
                onEdit={() => setEditing(q)}
                onDelete={() => handleDelete(q)}
              />
            ))}
          </div>
        )}
      </Card>

      {editing && (
        <QuestionForm
          categories={categories}
          themes={themes}
          tags={tags}
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
