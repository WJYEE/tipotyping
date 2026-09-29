import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ChevronRightIcon, PlusIcon } from "@/components/ui/icons";
import { categoryRepo, questionRepo, themeRepo } from "@/db/repositories";
import type { Category, Theme } from "@/types/domain";
import { ThemeCard } from "@/features/theme-selection/ThemeCard";
import {
  ThemeManagementModal,
  type ThemeManagementMode,
} from "@/features/theme-selection/ThemeManagementModal";

interface ModalState {
  mode: ThemeManagementMode;
  category?: Category;
  theme?: Theme;
  defaultCategoryId?: string;
}

export function ThemeSelectionScreen() {
  const navigate = useNavigate();
  const categories = useLiveQuery(() => categoryRepo.list(), []) ?? [];
  const themes = useLiveQuery(() => themeRepo.list(), []) ?? [];
  const questions = useLiveQuery(() => questionRepo.list(), []) ?? [];

  const [selectedThemeIds, setSelectedThemeIds] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState | null>(null);

  const questionCountByTheme = new Map<string, number>();
  for (const q of questions) {
    questionCountByTheme.set(q.themeId, (questionCountByTheme.get(q.themeId) ?? 0) + 1);
  }

  function toggleTheme(themeId: string) {
    setSelectedThemeIds((prev) => {
      const next = new Set(prev);
      if (next.has(themeId)) next.delete(themeId);
      else next.add(themeId);
      return next;
    });
  }

  function toggleCategoryAll(categoryId: string) {
    const themeIdsInCategory = themes.filter((t) => t.categoryId === categoryId).map((t) => t.id);
    const allSelected = themeIdsInCategory.every((id) => selectedThemeIds.has(id));
    setSelectedThemeIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        themeIdsInCategory.forEach((id) => next.delete(id));
      } else {
        themeIdsInCategory.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleDeleteTheme(theme: Theme) {
    if (!confirm(`"${theme.name}" 테마를 삭제할까요?`)) return;
    try {
      await themeRepo.remove(theme.id);
      setSelectedThemeIds((prev) => {
        const next = new Set(prev);
        next.delete(theme.id);
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  async function handleDeleteCategory(category: Category) {
    if (!confirm(`"${category.name}" 대분류를 삭제할까요?`)) return;
    try {
      await categoryRepo.remove(category.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  function handleStart() {
    navigate("/play/setup", { state: { themeIds: [...selectedThemeIds] } });
  }

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-6 py-10 pb-28 md:px-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-2xl font-extrabold text-text-primary">
            📚 학습 테마 선택
          </h1>
          <p className="font-body text-sm text-text-secondary">
            학습할 카드 덱 테마를 골라 게임 대기실로 이동해보세요! ({selectedThemeIds.size}개 선택됨)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: "add-category" })}
          className="flex items-center gap-1 font-body text-sm font-semibold text-accent"
        >
          대분류 추가
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-10">
        {categories.map((category) => {
          const categoryThemes = themes.filter((t) => t.categoryId === category.id);
          const allSelected =
            categoryThemes.length > 0 && categoryThemes.every((t) => selectedThemeIds.has(t.id));

          return (
            <section key={category.id} className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-lg font-extrabold text-text-primary">
                    {category.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => toggleCategoryAll(category.id)}
                    className="rounded-pill border border-border-strong px-3 py-1 font-body text-xs font-semibold text-text-secondary hover:bg-accent-soft"
                  >
                    {allSelected ? "전체 해제" : "전체 선택"}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModal({ mode: "edit-category", category })}
                    className="font-body text-xs text-text-secondary hover:text-text-primary"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(category)}
                    className="font-body text-xs text-text-secondary hover:text-danger"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {categoryThemes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    questionCount={questionCountByTheme.get(theme.id) ?? 0}
                    selected={selectedThemeIds.has(theme.id)}
                    onToggleSelect={() => toggleTheme(theme.id)}
                    onEdit={() => setModal({ mode: "edit-theme", theme })}
                    onDelete={() => handleDeleteTheme(theme)}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => setModal({ mode: "add-theme", defaultCategoryId: category.id })}
                  className="flex w-[140px] flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border p-4 text-text-secondary hover:border-accent hover:text-accent"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span className="font-body text-xs font-semibold">테마 추가</span>
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {modal && (
        <ThemeManagementModal
          mode={modal.mode}
          categories={categories}
          category={modal.category}
          theme={modal.theme}
          defaultCategoryId={modal.defaultCategoryId}
          onClose={() => setModal(null)}
        />
      )}

      {selectedThemeIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center border-t-2 border-border-strong bg-surface py-4">
          <Button variant="success" className="!px-8 !py-3 font-display text-base font-extrabold" onClick={handleStart}>
            선택한 테마로 시작하기 ({selectedThemeIds.size})
          </Button>
        </div>
      )}
    </div>
  );
}
