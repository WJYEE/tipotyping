import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { conceptBootstrapRepo, type ApplyBootstrapResult } from "@/db/repositories/conceptBootstrapRepo";
import { buildBootstrapDraft, type BootstrapDraft, type BootstrapInput, type ThemeDraft } from "@/lib/knowledge/bootstrap/buildDraft";
import { defaultDecisions, resolveBootstrapPlan, type BootstrapDecisions } from "@/lib/knowledge/bootstrap/resolvePlan";
import { CandidateRow } from "@/features/concept-bootstrap/CandidateRow";

const EXCLUDED_REASON_LABELS = { meta: "개념 아님", "theme-broad": "Theme 전체", generic: "일반 Tag" } as const;

type Loaded = { input: BootstrapInput; draft: BootstrapDraft };

/**
 * Concept Bootstrap 검토 화면. 흐름: 분석(읽기 전용) → Draft 검토 → 적용.
 * 이 화면에서 [적용]을 누르기 전까지 DB(knowledgeConcepts / questionConcepts)는 바뀌지 않는다.
 */
export function ConceptBootstrapScreen() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [decisions, setDecisions] = useState<BootstrapDecisions>({ included: {}, names: {}, excludedQuestions: {} });
  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<ApplyBootstrapResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoaded(null);
    const input = await conceptBootstrapRepo.loadInput();
    const draft = buildBootstrapDraft(input);
    setLoaded({ input, draft });
    setDecisions(defaultDecisions(draft));
  }, []);

  useEffect(() => {
    void analyze();
  }, [analyze]);

  const questionById = useMemo(() => new Map((loaded?.input.questions ?? []).map((q) => [q.id, q])), [loaded]);
  const conceptById = useMemo(() => new Map((loaded?.input.concepts ?? []).map((c) => [c.id, c])), [loaded]);

  const plan = useMemo(
    () => (loaded ? resolveBootstrapPlan(loaded.draft, decisions, { concepts: loaded.input.concepts, links: loaded.input.links }) : null),
    [loaded, decisions],
  );
  const errorByKey = useMemo(() => new Map((plan?.errors ?? []).map((e) => [e.key, e.message])), [plan]);

  function setIncluded(keys: string[], value: boolean) {
    setDecisions((d) => ({ ...d, included: { ...d.included, ...Object.fromEntries(keys.map((k) => [k, value])) } }));
  }

  function bulk(confidence: "HIGH" | "REVIEW", value: boolean) {
    if (!loaded) return;
    const keys = loaded.draft.themes
      .flatMap((t) => t.candidates)
      .filter((c) => c.confidence === confidence && !c.existingArchived)
      .map((c) => c.key);
    setIncluded(keys, value);
  }

  async function handleApply() {
    if (!plan || plan.errors.length > 0) return;
    setApplying(true);
    setError(null);
    try {
      setApplied(await conceptBootstrapRepo.apply(plan));
      setConfirming(false);
      await analyze(); // 적용 결과를 반영해 다시 분석 → 만든 개념이 "기존 개념"으로 보인다
    } catch (e) {
      setError(e instanceof Error ? e.message : "적용하지 못했습니다. 아무것도 변경되지 않았습니다.");
    } finally {
      setApplying(false);
    }
  }

  const themesWithCandidates = loaded?.draft.themes.filter((t) => t.candidates.length > 0) ?? [];
  const themesWithout = loaded?.draft.themes.filter((t) => t.candidates.length === 0) ?? [];
  const totals = loaded?.draft.totals;

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-6 py-10 md:px-10">
      <div className="flex flex-col gap-1.5">
        <Link to="/questions" className="font-body text-sm font-semibold text-text-secondary hover:text-text-primary">
          ← 문제 보관함
        </Link>
        <h1 className="font-display text-2xl font-extrabold text-text-primary">🌟 Knowledge Concepts 초안</h1>
        <p className="font-body text-sm text-text-secondary">
          Tipo가 문제와 Tag를 분석해 "별이 될 개념"의 초안을 만들었습니다. 전체 구조를 훑어보고 [적용]을 누르기 전까지는 아무것도 저장되지 않습니다.
          기존 문제·Tag·학습 기록은 어떤 경우에도 변경되지 않습니다.
        </p>
      </div>

      {applied && (
        <Card className="!border-success !bg-success-soft">
          <p className="font-body text-sm font-semibold text-text-primary">
            적용 완료 — 새 개념 {applied.createdConcepts}개 · 기존 개념 재사용 {applied.reusedConcepts}개 · 새 연결 {applied.createdLinks}개
            {applied.skippedLinks > 0 ? ` (건너뜀 ${applied.skippedLinks})` : ""}
          </p>
          {applied.warnings.map((w) => (
            <p key={w} className="font-body text-xs text-text-secondary">
              {w}
            </p>
          ))}
        </Card>
      )}

      {!loaded || !plan || !totals ? (
        <Card>
          <p className="py-6 text-center font-body text-sm text-text-secondary">문제와 Tag를 분석하는 중…</p>
        </Card>
      ) : (
        <>
          <Card className="sticky top-2 z-10 flex flex-col gap-3 !p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-body text-sm text-text-primary">
                문제 {loaded.input.questions.length}개 · Tag {loaded.input.tags.length}개 분석 →{" "}
                <span className="font-bold">후보 {totals.candidates}개</span> (확실 {totals.high} · 검토 필요 {totals.review}
                {totals.existing > 0 ? ` · 기존 개념 ${totals.existing}` : ""})
              </p>
              <p className="font-body text-xs text-text-secondary">
                선택됨: 새 개념 {plan.summary.newConcepts} · 기존 개념 연결 {plan.summary.existingConcepts} · 새 연결 {plan.summary.newLinks}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => bulk("HIGH", true)}>
                확실 후보 전체 포함
              </Button>
              <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => bulk("HIGH", false)}>
                확실 후보 전체 해제
              </Button>
              <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => bulk("REVIEW", false)}>
                검토 필요 전체 제외
              </Button>
              <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => void analyze()}>
                다시 분석
              </Button>
              <div className="ml-auto">
                <Button
                  variant="primary"
                  className="!px-4 !py-2 text-sm"
                  disabled={plan.items.length === 0 || plan.errors.length > 0 || applying}
                  onClick={() => setConfirming(true)}
                >
                  적용 내용 확인…
                </Button>
              </div>
            </div>
            {plan.errors.length > 0 && (
              <p className="font-body text-xs font-semibold text-danger">이름을 확인해야 하는 후보가 {plan.errors.length}개 있습니다. 수정하거나 제외해 주세요.</p>
            )}
          </Card>

          {confirming && (
            <Card emphasized className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-extrabold text-text-primary">이렇게 적용됩니다</h2>
              <ul className="list-disc pl-5 font-body text-sm text-text-primary">
                <li>새 개념 {plan.summary.newConcepts}개를 만들고, 기존 개념 {plan.summary.existingConcepts}개에는 문제 연결만 추가합니다.</li>
                <li>
                  문제 {plan.summary.questionsTouched}개에 새 연결 {plan.summary.newLinks}개 (대표(primary) {plan.summary.primaryLinks} · 보조(secondary){" "}
                  {plan.summary.secondaryLinks}). 근거가 애매한 연결은 모두 보조로 두며, 대표 개념은 나중에 정할 수 있습니다.
                </li>
                {plan.summary.alreadyLinked > 0 && <li>이미 연결된 {plan.summary.alreadyLinked}개는 그대로 둡니다.</li>}
                <li>문제 · Tag · 학습 기록은 변경하지 않습니다. 같은 초안을 다시 적용해도 중복이 생기지 않습니다.</li>
              </ul>
              <details className="font-body text-xs text-text-secondary">
                <summary className="cursor-pointer font-semibold text-text-primary">만들어질 개념 보기</summary>
                <div className="mt-2 flex flex-col gap-1">
                  {themeNamesWithItems(loaded.draft, plan.items).map(([theme, names]) => (
                    <p key={theme}>
                      <span className="font-semibold text-text-primary">{theme}</span>: {names.join(", ")}
                    </p>
                  ))}
                </div>
              </details>
              {error && <p className="font-body text-sm font-semibold text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button variant="success" className="!px-4 !py-2 text-sm" disabled={applying} onClick={() => void handleApply()}>
                  {applying ? "적용 중…" : "적용"}
                </Button>
                <Button variant="secondary" className="!px-4 !py-2 text-sm" disabled={applying} onClick={() => setConfirming(false)}>
                  취소
                </Button>
              </div>
            </Card>
          )}

          {themesWithCandidates.length === 0 && (
            <Card>
              <p className="py-6 text-center font-body text-sm text-text-secondary">
                제안할 개념 후보가 없습니다. 같은 Tag가 여러 문제에 붙어 있으면 후보가 만들어집니다.
              </p>
            </Card>
          )}

          {themesWithCandidates.map((theme) => (
            <ThemeSection
              key={theme.themeId}
              theme={theme}
              decisions={decisions}
              errorByKey={errorByKey}
              questionById={questionById}
              conceptName={(id) => conceptById.get(id)?.name}
              onInclude={(key, value) => setIncluded([key], value)}
              onRename={(key, name) => setDecisions((d) => ({ ...d, names: { ...d.names, [key]: name } }))}
              onToggleQuestion={(key, questionId, value) =>
                setDecisions((d) => {
                  const current = new Set(d.excludedQuestions[key] ?? []);
                  if (value) current.delete(questionId);
                  else current.add(questionId);
                  return { ...d, excludedQuestions: { ...d.excludedQuestions, [key]: [...current] } };
                })
              }
            />
          ))}

          {(themesWithout.length > 0 || loaded.draft.emptyThemeCount > 0) && (
            <details className="font-body text-xs text-text-secondary">
              <summary className="cursor-pointer font-semibold">
                후보가 없는 Theme {themesWithout.length + loaded.draft.emptyThemeCount}개
              </summary>
              <ul className="mt-2 flex flex-col gap-1 pl-4">
                {themesWithout.map((t) => (
                  <li key={t.themeId}>
                    {t.themeName} ({t.questionCount}문제) — 후보로 올릴 만큼 반복되는 Tag가 없습니다
                    {t.excludedTags.length > 0 ? ` · 제외된 Tag ${t.excludedTags.length}개` : ""}
                  </li>
                ))}
                {loaded.draft.emptyThemeCount > 0 && <li>문제가 없는 Theme {loaded.draft.emptyThemeCount}개는 분석하지 않았습니다.</li>}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function themeNamesWithItems(draft: BootstrapDraft, items: { themeId: string; name: string; existingConceptId?: string }[]): [string, string[]][] {
  const themeName = new Map(draft.themes.map((t) => [t.themeId, t.themeName]));
  const grouped = new Map<string, string[]>();
  for (const item of items) {
    if (item.existingConceptId) continue;
    const key = themeName.get(item.themeId) ?? "";
    grouped.set(key, [...(grouped.get(key) ?? []), item.name]);
  }
  return [...grouped];
}

interface ThemeSectionProps {
  theme: ThemeDraft;
  decisions: BootstrapDecisions;
  errorByKey: Map<string, string>;
  questionById: Map<string, import("@/types/domain").Question>;
  conceptName: (id: string) => string | undefined;
  onInclude: (key: string, value: boolean) => void;
  onRename: (key: string, name: string) => void;
  onToggleQuestion: (key: string, questionId: string, value: boolean) => void;
}

function ThemeSection({ theme, decisions, errorByKey, questionById, conceptName, onInclude, onRename, onToggleQuestion }: ThemeSectionProps) {
  const [showReview, setShowReview] = useState(false);
  const high = theme.candidates.filter((c) => c.confidence === "HIGH");
  const review = theme.candidates.filter((c) => c.confidence === "REVIEW");
  const includedReview = review.filter((c) => decisions.included[c.key]).length;

  const row = (c: (typeof theme.candidates)[number]) => (
    <CandidateRow
      key={c.key}
      candidate={c}
      included={!!decisions.included[c.key]}
      name={c.status === "EXISTING" ? c.name : (decisions.names[c.key] ?? c.name)}
      error={errorByKey.get(c.key)}
      excludedQuestionIds={decisions.excludedQuestions[c.key] ?? []}
      questionById={questionById}
      existingConceptName={c.aliasOfConceptId ? conceptName(c.aliasOfConceptId) : undefined}
      onToggle={(v) => onInclude(c.key, v)}
      onRename={(n) => onRename(c.key, n)}
      onToggleQuestion={(qid, v) => onToggleQuestion(c.key, qid, v)}
    />
  );

  return (
    <Card className="!p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border-strong px-4 py-3">
        <h2 className="font-display text-lg font-extrabold text-text-primary">
          {theme.themeName} <span className="font-body text-xs font-semibold text-text-secondary">{theme.questionCount}문제</span>
        </h2>
        <div className="flex items-center gap-2">
          {high.length > 0 && <Badge tone="success">확실 {high.length}</Badge>}
          {review.length > 0 && <Badge tone="warning">검토 필요 {review.length}</Badge>}
        </div>
      </div>

      {high.length > 0 && <div>{high.map(row)}</div>}

      {review.length > 0 && (
        <div className="border-t border-border">
          <button
            type="button"
            aria-expanded={showReview}
            onClick={() => setShowReview((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left font-body text-sm font-semibold text-text-primary hover:bg-bg"
          >
            <span>
              검토 필요 {review.length}개 {includedReview > 0 && <span className="text-text-secondary">· 포함 {includedReview}</span>}
            </span>
            <span>{showReview ? "▴" : "▾"}</span>
          </button>
          {showReview && <div className="border-t border-border">{review.map(row)}</div>}
        </div>
      )}

      {theme.excludedTags.length > 0 && (
        <details className="border-t border-border px-4 py-2 font-body text-xs text-text-secondary">
          <summary className="cursor-pointer font-semibold">
            개념 후보에서 제외한 Tag {theme.excludedTags.length}개{theme.tooFewCount > 0 ? ` · 문제 1개짜리 Tag ${theme.tooFewCount}개` : ""}
          </summary>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {theme.excludedTags.map((e) => (
              <li key={e.tagId} title={e.detail}>
                #{e.name} <span className="text-text-secondary">({e.questionCount} · {EXCLUDED_REASON_LABELS[e.reason]})</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
