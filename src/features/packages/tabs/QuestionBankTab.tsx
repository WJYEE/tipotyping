import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { settingsRepo } from "@/db/repositories";
import { CategoryChips, SearchBox, type CategoryChip } from "@/features/packages/CategoryChips";
import {
  categoryKeyOfQuestion,
  INCLUDE_UNREVIEWED_KEY,
  type PackageData,
} from "@/features/packages/usePackageData";
import { packagePath } from "@/lib/packages/definitions";
import {
  computeQuestionProgress,
  EMPTY_QUESTION_VIEW_FILTER,
  filterQuestions,
  groupDerivedByParent,
} from "@/lib/packages/packageView";
import type { Difficulty, MultipleChoicePayload, Question } from "@/types/domain";
import type { DerivedQuestion, PackageId } from "@/types/package";

const DIFFICULTY_LABELS: Record<Difficulty, string> = { beginner: "기초", intermediate: "중급", advanced: "심화" };

interface Props {
  packageId: PackageId;
  data: PackageData;
  categoryKey: string;
  onCategoryChange: (key: string) => void;
}

export function QuestionBankTab({ packageId, data, categoryKey, onCategoryChange }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [onlyWrong, setOnlyWrong] = useState(false);

  const filter = { ...EMPTY_QUESTION_VIEW_FILTER, categoryKey, search, difficulty, onlyWrong, includeUnreviewed: data.includeUnreviewed };
  const visible = filterQuestions(data.questions, data.recordMap, filter, categoryKeyOfQuestion);
  const derivedByParent = groupDerivedByParent(data.derived);

  if (data.questions.length === 0) {
    return (
      <Card className="font-body text-sm text-text-secondary">
        {packageId === "kb-bridge"
          ? "문제가 아직 없습니다. 위의 \"콘텐츠 가져오기\"를 눌러 KB-Bridge 문제은행을 불러오세요."
          : "이 패키지에는 아직 문제가 없습니다."}
      </Card>
    );
  }

  const chips: CategoryChip[] = data.categories.map((c) => {
    const inCategory = data.questions.filter((q) => categoryKeyOfQuestion(q) === c.key);
    const p = computeQuestionProgress(inCategory, data.recordMap);
    return { key: c.key, label: c.name, hint: `${p.attempted}/${p.total}` };
  });

  // 연습은 보이는 범위(선택 카테고리, 없으면 전체 카테고리)의 Theme로 시작한다.
  const themeIds = categoryKey
    ? data.categories.filter((c) => c.key === categoryKey).map((c) => c.themeId)
    : data.categories.map((c) => c.themeId);
  const reviewStatuses = data.includeUnreviewed ? undefined : (["reviewed"] as const);
  const wrongCount = filterQuestions(data.questions, data.recordMap, { ...filter, search: "", difficulty: "", onlyWrong: true }, categoryKeyOfQuestion).length;

  function startPractice(orderMode?: "wrong-first") {
    navigate("/play/setup", {
      state: { themeIds, reviewStatuses: reviewStatuses ? [...reviewStatuses] : undefined, orderMode },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {chips.length > 0 && <CategoryChips chips={chips} value={categoryKey} onChange={onCategoryChange} />}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="md:flex-1">
          <SearchBox value={search} onChange={setSearch} placeholder="문제·코드(KBB-0001)·해설 검색" />
        </div>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}
          aria-label="난이도"
          className="rounded-badge border border-border bg-surface px-3 py-2 font-body text-sm text-text-primary"
        >
          <option value="">난이도 전체</option>
          {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 font-body text-sm text-text-secondary">
          <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} />
          오답만
        </label>
        <label className="flex items-center gap-1.5 font-body text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={data.includeUnreviewed}
            onChange={(e) => void settingsRepo.set(INCLUDE_UNREVIEWED_KEY, e.target.checked)}
          />
          검수 전 초안 포함
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="success" className="!px-5 !py-2 text-sm" disabled={themeIds.length === 0 || visible.length === 0} onClick={() => startPractice()}>
          {categoryKey ? "이 카테고리 풀어보기" : "전체 풀어보기"}
        </Button>
        <Button variant="secondary" className="!px-5 !py-2 text-sm" disabled={wrongCount === 0} onClick={() => startPractice("wrong-first")}>
          오답 복습 ({wrongCount})
        </Button>
        <span className="font-body text-xs text-text-secondary">{visible.length}문항 표시 중</span>
      </div>

      {!data.includeUnreviewed && (
        <p className="font-body text-xs text-text-secondary">
          검수 전 초안을 숨기고 있어요. 검수 완료로 표시된 문제가 없으면 목록이 비어 보입니다.
        </p>
      )}

      {visible.length === 0 ? (
        <Card className="font-body text-sm text-text-secondary">조건에 맞는 문제가 없습니다.</Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((q) => (
            <QuestionItem
              key={q.id}
              question={q}
              packageId={packageId}
              derived={derivedByParent.get(q.id) ?? []}
              hasConcept={data.concepts.some((c) => c.categoryKey === categoryKeyOfQuestion(q))}
              lastResult={data.recordMap.get(q.id)?.lastResult ?? null}
              categoryName={data.categories.find((c) => c.key === categoryKeyOfQuestion(q))?.name}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface ItemProps {
  question: Question;
  packageId: PackageId;
  derived: DerivedQuestion[];
  hasConcept: boolean;
  lastResult: "correct" | "wrong" | null;
  categoryName?: string;
}

function QuestionItem({ question, packageId, derived, hasConcept, lastResult, categoryName }: ItemProps) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  if (question.type !== "multiple-choice") return null;
  const payload: MultipleChoicePayload = question.payload;
  const answered = revealed || picked !== null;

  return (
    <li>
      <Card className="flex flex-col gap-3 !p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full flex-col gap-2 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-text-secondary">{question.displayCode}</span>
            {categoryName && <Badge>{categoryName}</Badge>}
            {question.difficulty && <Badge tone="warning">{DIFFICULTY_LABELS[question.difficulty]}</Badge>}
            {question.reviewStatus === "needs_human_review" && <Badge tone="danger">검수 전 초안</Badge>}
            {lastResult === "correct" && <Badge tone="success">최근 정답</Badge>}
            {lastResult === "wrong" && <Badge tone="danger">최근 오답</Badge>}
          </div>
          <p className="font-body text-sm font-semibold text-text-primary">{payload.prompt}</p>
        </button>

        {open && (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <ol className="flex flex-col gap-2">
              {payload.options.map((opt, i) => {
                const isCorrect = i === payload.correctIndex;
                const isPicked = picked === i;
                const tone = !answered
                  ? "border-border hover:border-border-strong"
                  : isCorrect
                    ? "border-border-strong bg-success-soft"
                    : isPicked
                      ? "border-border-strong bg-danger-soft"
                      : "border-border opacity-70";
                return (
                  <li key={i}>
                    <button
                      type="button"
                      disabled={answered}
                      onClick={() => setPicked(i)}
                      className={`flex w-full items-start gap-2 rounded-badge border px-3 py-2 text-left font-body text-sm text-text-primary ${tone}`}
                    >
                      <span className="font-bold">{i + 1}.</span>
                      <span>
                        {opt}
                        {answered && isCorrect && <b className="ml-2 text-xs">정답</b>}
                        {answered && isPicked && !isCorrect && <b className="ml-2 text-xs">내 선택</b>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {!answered && (
              <button type="button" onClick={() => setRevealed(true)} className="self-start font-body text-xs font-semibold text-accent">
                정답·해설 바로 보기
              </button>
            )}
            {answered && (
              <div className="flex flex-col gap-1 rounded-badge bg-accent-soft p-3 font-body text-sm text-text-primary">
                <p className="font-bold">
                  정답: {payload.correctIndex + 1}번 {picked !== null && (picked === payload.correctIndex ? "— 맞았어요!" : "— 아쉬워요")}
                </p>
                {question.explanation && <p>{question.explanation}</p>}
                <p className="text-xs text-text-secondary">
                  여기서의 확인은 학습 기록에 저장되지 않아요. 기록하려면 "풀어보기"로 풀이를 시작하세요.
                </p>
              </div>
            )}

            {hasConcept && (
              <Link
                to={{ pathname: packagePath(packageId, "concepts"), search: `?category=${question.themeId.replace(/^kbb-theme-/, "")}` }}
                className="self-start font-body text-xs font-semibold text-accent"
              >
                관련 개념 정리 보기 →
              </Link>
            )}

            {derived.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="font-display text-xs font-extrabold text-text-primary">
                  [파생질문] 생각해보기 · 복습 질문 ({derived.length})
                </p>
                <ul className="flex flex-col gap-2">
                  {derived.map((d) => (
                    <DerivedItem key={d.id} derived={d} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </li>
  );
}

/** 파생질문은 자동채점 문제가 아니다. 정답이 확정되지 않은 "생각해보기" 질문이며 채점 가이드는 검수 전 참고용이다. */
function DerivedItem({ derived }: { derived: DerivedQuestion }) {
  const [showGuide, setShowGuide] = useState(false);
  return (
    <li className="flex flex-col gap-1.5 rounded-badge border border-dashed border-border p-3">
      <p className="font-body text-sm text-text-primary">{derived.prompt}</p>
      {derived.learningObjective && <p className="font-body text-xs text-text-secondary">학습 목표: {derived.learningObjective}</p>}
      {derived.answerGuide && (
        <>
          <button type="button" onClick={() => setShowGuide((v) => !v)} aria-expanded={showGuide} className="self-start font-body text-xs font-semibold text-accent">
            {showGuide ? "답안 가이드 접기" : "답안 가이드 보기 (검수 전)"}
          </button>
          {showGuide && <p className="font-body text-xs text-text-secondary">{derived.answerGuide}</p>}
        </>
      )}
    </li>
  );
}
