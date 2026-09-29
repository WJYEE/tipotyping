import { SearchIcon } from "@/components/ui/icons";
import { QUESTION_TYPE_LABELS } from "@/lib/questionSummary";
import type { Category, Difficulty, QuestionType, Tag, Theme } from "@/types/domain";

export interface QuestionFilterState {
  search: string;
  categoryId: string;
  themeId: string;
  tagId: string;
  type: QuestionType | "";
  difficulty: Difficulty | "";
  onlyFlagged: boolean;
  onlyFavorite: boolean;
}

export const EMPTY_FILTERS: QuestionFilterState = {
  search: "",
  categoryId: "",
  themeId: "",
  tagId: "",
  type: "",
  difficulty: "",
  onlyFlagged: false,
  onlyFavorite: false,
};

const selectClass =
  "rounded-badge border border-border bg-surface px-3 py-2 font-body text-sm text-text-primary outline-none focus:border-accent";

interface QuestionFiltersProps {
  value: QuestionFilterState;
  onChange: (next: QuestionFilterState) => void;
  categories: Category[];
  themes: Theme[];
  tags: Tag[];
}

export function QuestionFilters({ value, onChange, categories, themes, tags }: QuestionFiltersProps) {
  const themeOptions = value.categoryId
    ? themes.filter((t) => t.categoryId === value.categoryId)
    : themes;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-badge border border-border bg-surface px-3 py-2">
        <SearchIcon className="h-4 w-4 text-text-secondary" />
        <input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="문제 내용 검색"
          className="flex-1 bg-transparent font-body text-sm text-text-primary outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={value.categoryId}
          onChange={(e) => onChange({ ...value, categoryId: e.target.value, themeId: "" })}
          className={selectClass}
        >
          <option value="">전체 대분류</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={value.themeId}
          onChange={(e) => onChange({ ...value, themeId: e.target.value })}
          className={selectClass}
        >
          <option value="">전체 테마</option>
          {themeOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          value={value.tagId}
          onChange={(e) => onChange({ ...value, tagId: e.target.value })}
          className={selectClass}
        >
          <option value="">전체 태그</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.name}
            </option>
          ))}
        </select>

        <select
          value={value.type}
          onChange={(e) => onChange({ ...value, type: e.target.value as QuestionType | "" })}
          className={selectClass}
        >
          <option value="">전체 유형</option>
          {Object.entries(QUESTION_TYPE_LABELS).map(([type, label]) => (
            <option key={type} value={type}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={value.difficulty}
          onChange={(e) => onChange({ ...value, difficulty: e.target.value as Difficulty | "" })}
          className={selectClass}
        >
          <option value="">전체 난이도</option>
          <option value="beginner">초급</option>
          <option value="intermediate">중급</option>
          <option value="advanced">고급</option>
        </select>

        <label className="flex items-center gap-1.5 rounded-badge border border-border bg-surface px-3 py-2 font-body text-sm text-text-primary">
          <input
            type="checkbox"
            checked={value.onlyFlagged}
            onChange={(e) => onChange({ ...value, onlyFlagged: e.target.checked })}
            className="h-4 w-4 accent-accent"
          />
          🚩 Flag만
        </label>
        <label className="flex items-center gap-1.5 rounded-badge border border-border bg-surface px-3 py-2 font-body text-sm text-text-primary">
          <input
            type="checkbox"
            checked={value.onlyFavorite}
            onChange={(e) => onChange({ ...value, onlyFavorite: e.target.checked })}
            className="h-4 w-4 accent-accent"
          />
          ⭐ Favorite만
        </label>
      </div>
    </div>
  );
}
