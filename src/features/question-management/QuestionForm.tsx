import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { questionRepo, tagRepo } from "@/db/repositories";
import { QUESTION_TYPE_LABELS } from "@/lib/questionSummary";
import type {
  BlankPayload,
  Category,
  Difficulty,
  MultipleChoicePayload,
  Question,
  QuestionType,
  Tag,
  TermDefPayload,
  Theme,
} from "@/types/domain";

const QUESTION_TYPES: QuestionType[] = [
  "blank",
  "term-to-def",
  "def-to-term",
  "answer-input",
  "multiple-choice",
  "essay",
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "초급" },
  { value: "intermediate", label: "중급" },
  { value: "advanced", label: "고급" },
];

const inputClass =
  "rounded-badge border border-border bg-surface px-3 py-2 font-body text-sm text-text-primary outline-none focus:border-accent";

function makeBlankId(index: number) {
  return `b${index + 1}`;
}

function defaultPayloadFor(type: QuestionType) {
  switch (type) {
    case "blank":
      return { template: "", blanks: [{ id: "b1", answer: "" }] } satisfies BlankPayload;
    case "term-to-def":
    case "def-to-term":
      return { term: "", definition: "" } satisfies TermDefPayload;
    case "answer-input":
      return { prompt: "", answer: "" };
    case "multiple-choice":
      return { prompt: "", options: ["", ""], correctIndex: 0 } satisfies MultipleChoicePayload;
    case "essay":
      return { prompt: "", answer: "" };
  }
}

interface QuestionFormProps {
  categories: Category[];
  themes: Theme[];
  tags: Tag[];
  initial?: Question;
  onClose: () => void;
}

export function QuestionForm({ categories, themes, tags, initial, onClose }: QuestionFormProps) {
  const isEdit = !!initial;

  const [type, setType] = useState<QuestionType>(initial?.type ?? "answer-input");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [themeOptions] = useState(themes);
  const themesInCategory = themeOptions.filter((t) => t.categoryId === categoryId);
  const [themeId, setThemeId] = useState(
    initial?.themeId ?? themesInCategory[0]?.id ?? "",
  );
  const activeTheme = themeOptions.find((t) => t.id === themeId);

  const [difficulty, setDifficulty] = useState<Difficulty | "">(initial?.difficulty ?? "");
  const [tagNames, setTagNames] = useState(
    initial ? initial.tagIds.map((id) => tags.find((t) => t.id === id)?.name ?? "").join(", ") : "",
  );
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [favorite, setFavorite] = useState(initial?.favorite ?? false);
  const [flagged, setFlagged] = useState(initial?.flagged ?? false);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [resetRecord, setResetRecord] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [payload, setPayload] = useState<any>(initial?.payload ?? defaultPayloadFor(type));

  function handleTypeChange(next: QuestionType) {
    setType(next);
    setPayload(defaultPayloadFor(next));
  }

  function handleCategoryChange(next: string) {
    setCategoryId(next);
    const firstTheme = themeOptions.find((t) => t.categoryId === next);
    setThemeId(firstTheme?.id ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !themeId) {
      setError("대분류/하위테마를 선택해주세요.");
      return;
    }

    try {
      const names = tagNames
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      const resolvedTags = await Promise.all(names.map((n) => tagRepo.getOrCreate(n)));

      const data = {
        categoryId,
        themeId,
        type,
        difficulty: difficulty || undefined,
        tagIds: resolvedTags.map((t) => t.id),
        explanation: explanation || undefined,
        flagged,
        favorite,
        memo: memo || undefined,
        payload,
      } as Omit<Question, "id" | "createdAt" | "updatedAt">;

      if (isEdit && initial) {
        await questionRepo.update(initial.id, data, { resetRecord });
      } else {
        await questionRepo.create(data);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-6">
      <Card className="max-h-[90vh] w-full max-w-xl overflow-y-auto">
        <h2 className="font-display text-lg font-extrabold text-text-primary">
          {isEdit ? "문제 수정" : "문제 추가"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-text-secondary">문제 유형</span>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
              className={inputClass}
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[13px] font-semibold text-text-secondary">대분류</span>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={inputClass}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[13px] font-semibold text-text-secondary">하위테마</span>
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value)}
                className={inputClass}
              >
                {themesInCategory.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {activeTheme?.useDifficulty && (
            <label className="flex flex-col gap-1.5">
              <span className="font-body text-[13px] font-semibold text-text-secondary">난이도</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}
                className={inputClass}
              >
                <option value="">선택 안 함</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <PayloadFields type={type} payload={payload} onChange={setPayload} />

          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-text-secondary">
              태그 (쉼표로 구분)
            </span>
            <input
              value={tagNames}
              onChange={(e) => setTagNames(e.target.value)}
              className={inputClass}
              placeholder="예: JOIN, WHERE"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-text-secondary">
              해설 (선택)
            </span>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className={`${inputClass} min-h-16`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[13px] font-semibold text-text-secondary">
              개인 메모 (선택)
            </span>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className={`${inputClass} min-h-12`}
            />
          </label>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(e) => setFavorite(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <span className="font-body text-sm text-text-primary">⭐ Favorite</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={flagged}
                onChange={(e) => setFlagged(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <span className="font-body text-sm text-text-primary">🚩 문제 오류 Flag</span>
            </label>
          </div>

          {isEdit && (
            <fieldset className="flex flex-col gap-2 rounded-badge border border-border p-3">
              <legend className="px-1 font-body text-[13px] font-semibold text-text-secondary">
                기존 학습 기록 처리
              </legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="resetRecord"
                  checked={!resetRecord}
                  onChange={() => setResetRecord(false)}
                  className="h-4 w-4 accent-accent"
                />
                <span className="font-body text-sm text-text-primary">유지 (기본값)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="resetRecord"
                  checked={resetRecord}
                  onChange={() => setResetRecord(true)}
                  className="h-4 w-4 accent-accent"
                />
                <span className="font-body text-sm text-text-primary">초기화</span>
              </label>
            </fieldset>
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

function PayloadFields({
  type,
  payload,
  onChange,
}: {
  type: QuestionType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (next: any) => void;
}) {
  if (type === "blank") {
    const p = payload as BlankPayload;
    return (
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-[13px] font-semibold text-text-secondary">
            원본 (빈칸은 {"{{"}b1{"}}"} 형태로 표시)
          </span>
          <textarea
            value={p.template}
            onChange={(e) => onChange({ ...p, template: e.target.value })}
            className={`${inputClass} min-h-20 font-mono`}
          />
        </label>
        <div className="flex flex-col gap-2">
          {p.blanks.map((blank, i) => (
            <div key={blank.id} className="flex items-center gap-2">
              <span className="w-10 font-body text-xs text-text-secondary">{blank.id}</span>
              <input
                value={blank.answer}
                onChange={(e) => {
                  const blanks = [...p.blanks];
                  blanks[i] = { ...blanks[i], answer: e.target.value };
                  onChange({ ...p, blanks });
                }}
                className={`${inputClass} flex-1`}
                placeholder="정답"
              />
              <button
                type="button"
                onClick={() => onChange({ ...p, blanks: p.blanks.filter((_, j) => j !== i) })}
                className="text-text-secondary hover:text-danger"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...p,
                blanks: [...p.blanks, { id: makeBlankId(p.blanks.length), answer: "" }],
              })
            }
            className="flex items-center gap-1 self-start font-body text-xs font-semibold text-accent"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            빈칸 추가
          </button>
        </div>
      </div>
    );
  }

  if (type === "term-to-def" || type === "def-to-term") {
    const p = payload as TermDefPayload;
    return (
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-[13px] font-semibold text-text-secondary">용어</span>
          <input
            value={p.term}
            onChange={(e) => onChange({ ...p, term: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-[13px] font-semibold text-text-secondary">정의</span>
          <textarea
            value={p.definition}
            onChange={(e) => onChange({ ...p, definition: e.target.value })}
            className={`${inputClass} min-h-16`}
          />
        </label>
      </div>
    );
  }

  if (type === "multiple-choice") {
    const p = payload as MultipleChoicePayload;
    return (
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-[13px] font-semibold text-text-secondary">문제</span>
          <textarea
            value={p.prompt}
            onChange={(e) => onChange({ ...p, prompt: e.target.value })}
            className={`${inputClass} min-h-16`}
          />
        </label>
        <div className="flex flex-col gap-2">
          {p.options.map((opt: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                checked={p.correctIndex === i}
                onChange={() => onChange({ ...p, correctIndex: i })}
                className="h-4 w-4 accent-accent"
              />
              <input
                value={opt}
                onChange={(e) => {
                  const options = [...p.options];
                  options[i] = e.target.value;
                  onChange({ ...p, options });
                }}
                className={`${inputClass} flex-1`}
                placeholder={`보기 ${i + 1}`}
              />
              {p.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const options = p.options.filter((_: string, j: number) => j !== i);
                    const correctIndex = p.correctIndex >= options.length ? 0 : p.correctIndex;
                    onChange({ ...p, options, correctIndex });
                  }}
                  className="text-text-secondary hover:text-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...p, options: [...p.options, ""] })}
            className="flex items-center gap-1 self-start font-body text-xs font-semibold text-accent"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            보기 추가
          </button>
        </div>
      </div>
    );
  }

  // answer-input, essay
  const p = payload as { prompt: string; answer: string };
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5">
        <span className="font-body text-[13px] font-semibold text-text-secondary">문제</span>
        <textarea
          value={p.prompt}
          onChange={(e) => onChange({ ...p, prompt: e.target.value })}
          className={`${inputClass} min-h-16`}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-body text-[13px] font-semibold text-text-secondary">
          정답 (Exact Match 채점)
        </span>
        <textarea
          value={p.answer}
          onChange={(e) => onChange({ ...p, answer: e.target.value })}
          className={`${inputClass} min-h-12`}
        />
      </label>
    </div>
  );
}
