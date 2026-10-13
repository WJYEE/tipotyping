import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { ConceptCandidate, ReviewReason } from "@/lib/knowledge/bootstrap/buildDraft";
import { getQuestionSummary } from "@/lib/questionSummary";
import type { Question } from "@/types/domain";

const REASON_LABELS: Record<ReviewReason, string> = {
  "broad-topic": "범위가 넓음",
  "low-text-evidence": "문제 본문 근거 부족",
  "few-questions": "문제가 적음",
  "cross-theme": "여러 Theme에서 쓰는 Tag",
  "alias-match": "기존 개념의 별칭과 같음",
  "existing-archived": "보관된 개념과 같은 이름",
};

const EVIDENCE_LABELS = { tag: "Tag", text: "본문", "tag+text": "Tag·본문" } as const;

interface CandidateRowProps {
  candidate: ConceptCandidate;
  included: boolean;
  name: string;
  error?: string;
  excludedQuestionIds: string[];
  questionById: Map<string, Question>;
  existingConceptName?: string;
  onToggle: (included: boolean) => void;
  onRename: (name: string) => void;
  onToggleQuestion: (questionId: string, included: boolean) => void;
}

export function CandidateRow({
  candidate,
  included,
  name,
  error,
  excludedQuestionIds,
  questionById,
  existingConceptName,
  onToggle,
  onRename,
  onToggleQuestion,
}: CandidateRowProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [open, setOpen] = useState(false);

  const excluded = new Set(excludedQuestionIds);
  const linkable = candidate.mappings.filter((m) => !m.alreadyLinked);
  const selectedCount = linkable.filter((m) => !excluded.has(m.questionId)).length;
  const alreadyCount = candidate.mappings.length - linkable.length;
  const canRename = candidate.status === "NEW";
  const disabled = !!candidate.existingArchived;

  function commitName() {
    setEditing(false);
    if (draftName !== name) onRename(draftName);
  }

  return (
    <div className="border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
          checked={included && !disabled}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          aria-label={`${name} 포함`}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") {
                    setDraftName(name);
                    setEditing(false);
                  }
                }}
                aria-label="개념 이름"
                className="rounded-badge border-2 border-border-strong bg-surface px-2 py-0.5 font-body text-sm font-semibold text-text-primary outline-none"
              />
            ) : (
              <button
                type="button"
                disabled={!canRename}
                onClick={() => {
                  setDraftName(name);
                  setEditing(true);
                }}
                title={canRename ? "이름 수정" : undefined}
                className={`font-body text-sm font-bold text-text-primary ${canRename ? "hover:underline" : "cursor-default"}`}
              >
                {name}
              </button>
            )}
            {candidate.status === "EXISTING" ? (
              <Badge tone={candidate.existingArchived ? "warning" : "success"}>
                {candidate.existingArchived ? "보관된 개념" : "기존 개념에 연결"}
              </Badge>
            ) : (
              <Badge tone="accent">새 개념</Badge>
            )}
            {candidate.reasons.map((r) => (
              <Badge key={r} tone="warning">
                {REASON_LABELS[r]}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-xs text-text-secondary">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="font-semibold text-text-primary underline-offset-2 hover:underline"
            >
              {selectedCount}문제 {open ? "▴" : "▾"}
            </button>
            <span>
              Tag {candidate.stats.taggedCount}
              {candidate.stats.textOnlyCount > 0 ? ` + 본문 ${candidate.stats.textOnlyCount}` : ""}
            </span>
            {alreadyCount > 0 && <span>이미 연결 {alreadyCount}</span>}
            {candidate.aliasOfConceptId && existingConceptName && <span>"{existingConceptName}"의 별칭과 같음 (자동으로 합치지 않음)</span>}
          </div>

          {error && included && <p className="font-body text-xs font-semibold text-danger">{error}</p>}

          {open && (
            <ul className="mt-1 flex flex-col gap-1 rounded-badge border border-border bg-bg p-2">
              {candidate.mappings.map((m) => {
                const q = questionById.get(m.questionId);
                if (!q) return null;
                const checked = !excluded.has(m.questionId);
                return (
                  <li key={m.questionId} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      checked={checked && !m.alreadyLinked}
                      disabled={m.alreadyLinked}
                      onChange={(e) => onToggleQuestion(m.questionId, e.target.checked)}
                      aria-label={`${q.displayCode} 연결`}
                    />
                    <span className="shrink-0 rounded-badge border border-border px-1 font-mono text-[11px] text-text-secondary">{q.displayCode}</span>
                    <span className="min-w-0 flex-1 truncate font-body text-xs text-text-primary">{getQuestionSummary(q)}</span>
                    <span className="shrink-0 font-body text-[11px] text-text-secondary">
                      {m.alreadyLinked ? "이미 연결됨" : EVIDENCE_LABELS[m.evidence]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
