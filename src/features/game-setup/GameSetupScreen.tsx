import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { questionRepo, tagRepo, themeRepo } from "@/db/repositories";
import { filterQuestions, type GameConfig } from "@/lib/questionSelection";
import { QUESTION_TYPE_LABELS } from "@/lib/questionSummary";
import type { Difficulty, OrderMode, QuestionType } from "@/types/domain";

const ALL_TYPES: QuestionType[] = [
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

const ORDER_MODES: { value: OrderMode; label: string; desc: string }[] = [
  { value: "sequential", label: "순서대로", desc: "문제 등록순" },
  { value: "random", label: "랜덤", desc: "선택 범위 내 무작위" },
  { value: "new-first", label: "새 문제 우선", desc: "한 번도 풀지 않은 문제부터" },
  { value: "wrong-first", label: "오답 우선", desc: "최근 오답인 문제부터" },
];

export function GameSetupScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const themeIds: string[] = (location.state as { themeIds?: string[] } | null)?.themeIds ?? [];

  const themes = useLiveQuery(() => themeRepo.list(), []) ?? [];
  const questions = useLiveQuery(() => questionRepo.list(), []) ?? [];
  const tags = useLiveQuery(() => tagRepo.list(), []) ?? [];

  const selectedThemes = themes.filter((t) => themeIds.includes(t.id));
  const showDifficulty = selectedThemes.some((t) => t.useDifficulty);

  const [types, setTypes] = useState<Set<QuestionType>>(new Set(ALL_TYPES));
  const [tagIds, setTagIds] = useState<Set<string>>(new Set());
  const [difficulties, setDifficulties] = useState<Set<Difficulty>>(new Set());
  const [orderMode, setOrderMode] = useState<OrderMode>("sequential");

  if (themeIds.length === 0) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 px-6 py-20 text-center">
        <p className="font-body text-sm text-text-secondary">
          먼저 학습할 테마를 선택해주세요.
        </p>
        <Link to="/play" className="font-body text-sm font-semibold text-accent">
          테마 선택으로 이동
        </Link>
      </div>
    );
  }

  const availableTags = tags.filter((tag) =>
    questions.some((q) => themeIds.includes(q.themeId) && q.tagIds.includes(tag.id)),
  );

  function toggleFromSet<T>(set: Set<T>, value: T, setter: (next: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  const config: GameConfig = {
    themeIds,
    questionTypes: [...types],
    tagIds: [...tagIds],
    difficulties: showDifficulty ? [...difficulties] : [],
    orderMode,
  };
  const matchingCount = filterQuestions(questions, config).length;

  function handleStart() {
    navigate("/play/typing", { state: { config } });
  }

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-8 px-6 py-10 md:px-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-2xl font-extrabold text-text-primary">🎮 게임 설정</h1>
        <p className="font-body text-sm text-text-secondary">
          선택한 테마: {selectedThemes.map((t) => t.name).join(", ")}
        </p>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-extrabold text-text-primary">문제 유형</h2>
          <button
            type="button"
            onClick={() => setTypes(types.size === ALL_TYPES.length ? new Set() : new Set(ALL_TYPES))}
            className="font-body text-xs font-semibold text-accent"
          >
            {types.size === ALL_TYPES.length ? "전체 해제" : "전체 선택"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleFromSet(types, t, setTypes)}
              className={`rounded-pill border px-3 py-1.5 font-body text-sm ${
                types.has(t)
                  ? "border-border-strong bg-accent-soft font-semibold text-text-primary"
                  : "border-border text-text-secondary"
              }`}
            >
              {QUESTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </Card>

      {availableTags.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-base font-extrabold text-text-primary">태그</h2>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleFromSet(tagIds, tag.id, setTagIds)}
                className={`rounded-pill border px-3 py-1.5 font-body text-sm ${
                  tagIds.has(tag.id)
                    ? "border-border-strong bg-accent-soft font-semibold text-text-primary"
                    : "border-border text-text-secondary"
                }`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </Card>
      )}

      {showDifficulty && (
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-base font-extrabold text-text-primary">난이도</h2>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleFromSet(difficulties, d.value, setDifficulties)}
                className={`rounded-pill border px-3 py-1.5 font-body text-sm ${
                  difficulties.has(d.value)
                    ? "border-border-strong bg-accent-soft font-semibold text-text-primary"
                    : "border-border text-text-secondary"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-base font-extrabold text-text-primary">출제 모드</h2>
        <div className="flex flex-col gap-2">
          {ORDER_MODES.map((m) => (
            <label
              key={m.value}
              className="flex items-center gap-3 rounded-badge border border-border px-3 py-2"
            >
              <input
                type="radio"
                name="orderMode"
                checked={orderMode === m.value}
                onChange={() => setOrderMode(m.value)}
                className="h-4 w-4 accent-accent"
              />
              <span className="font-body text-sm font-semibold text-text-primary">{m.label}</span>
              <span className="font-body text-xs text-text-secondary">{m.desc}</span>
            </label>
          ))}
        </div>
      </Card>

      <div className="flex flex-col items-center gap-3 pb-6">
        <p className="font-body text-sm text-text-secondary">
          현재 설정으로 출제 가능한 문제: <strong className="text-text-primary">{matchingCount}개</strong>
        </p>
        <Button
          variant="success"
          className="!px-8 !py-4 font-display text-xl font-extrabold"
          disabled={matchingCount === 0 || types.size === 0}
          onClick={handleStart}
        >
          START
        </Button>
      </div>
    </div>
  );
}
