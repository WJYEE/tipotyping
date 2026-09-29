import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { categoryRepo, themeRepo } from "@/db/repositories";
import type { Category, Theme } from "@/types/domain";

export type ThemeManagementMode = "add-category" | "edit-category" | "add-theme" | "edit-theme";

interface ThemeManagementModalProps {
  mode: ThemeManagementMode;
  categories: Category[];
  category?: Category;
  theme?: Theme;
  defaultCategoryId?: string;
  onClose: () => void;
}

const TITLES: Record<ThemeManagementMode, string> = {
  "add-category": "대분류 추가",
  "edit-category": "대분류 수정",
  "add-theme": "하위테마 추가",
  "edit-theme": "하위테마 수정",
};

export function ThemeManagementModal({
  mode,
  categories,
  category,
  theme,
  defaultCategoryId,
  onClose,
}: ThemeManagementModalProps) {
  const isThemeMode = mode === "add-theme" || mode === "edit-theme";
  const [name, setName] = useState(category?.name ?? theme?.name ?? "");
  const [categoryId, setCategoryId] = useState(
    theme?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? "",
  );
  const [useDifficulty, setUseDifficulty] = useState(theme?.useDifficulty ?? false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("이름을 입력해주세요.");
      return;
    }

    try {
      if (mode === "add-category") {
        await categoryRepo.create({ name: trimmed, order: categories.length, isCustom: true });
      } else if (mode === "edit-category" && category) {
        await categoryRepo.update(category.id, { name: trimmed });
      } else if (mode === "add-theme") {
        if (!categoryId) {
          setError("대분류를 선택해주세요.");
          return;
        }
        const siblingCount = (await themeRepo.listByCategory(categoryId)).length;
        await themeRepo.create({
          categoryId,
          name: trimmed,
          order: siblingCount,
          isCustom: true,
          useDifficulty,
        });
      } else if (mode === "edit-theme" && theme) {
        await themeRepo.update(theme.id, { name: trimmed, categoryId, useDifficulty });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-6">
      <Card className="w-full max-w-sm">
        <h2 className="font-display text-lg font-extrabold text-text-primary">{TITLES[mode]}</h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-text-secondary">이름</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-badge border border-border bg-surface px-3 py-2 font-body text-sm text-text-primary outline-none focus:border-accent"
              placeholder={isThemeMode ? "예: SQL" : "예: 코딩"}
            />
          </label>

          {isThemeMode && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="font-body text-[13px] font-semibold text-text-secondary">
                  대분류
                </span>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="rounded-badge border border-border bg-surface px-3 py-2 font-body text-sm text-text-primary outline-none focus:border-accent"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useDifficulty}
                  onChange={(e) => setUseDifficulty(e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                <span className="font-body text-sm text-text-primary">
                  난이도(초급/중급/고급) 사용
                </span>
              </label>
            </>
          )}

          {error && <p className="font-body text-xs text-danger">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" className="!px-4 !py-2 text-sm" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" variant="primary" className="!px-4 !py-2 text-sm">
              저장
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
