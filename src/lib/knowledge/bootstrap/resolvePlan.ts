// 검토 결정(포함/제외, 이름 수정, 문제별 제외) → 실제로 적용될 계획(ApplyPlan). 순수 함수다.
// UI의 "적용 전 요약"과 실제 적용이 같은 계획을 쓰므로, 요약에서 본 것만 적용된다.
import { cleanConceptName, normalizeConceptName } from "@/lib/knowledge/conceptName";
import type { BootstrapDraft, ConceptCandidate } from "@/lib/knowledge/bootstrap/buildDraft";
import type { KnowledgeConcept, QuestionConcept, QuestionConceptRole } from "@/types/knowledge";

export interface BootstrapDecisions {
  /** 후보 key → 포함 여부 */
  included: Record<string, boolean>;
  /** 후보 key → 수정한 이름(NEW 후보만) */
  names: Record<string, string>;
  /** 후보 key → 이 후보에서 연결하지 않기로 한 문제 id */
  excludedQuestions: Record<string, string[]>;
}

/** 기본 결정: HIGH는 포함, REVIEW는 사용자가 직접 포함하기 전까지 제외. 보관된 개념과 이름이 같은 후보는 적용할 수 없으므로 제외. */
export function defaultDecisions(draft: BootstrapDraft): BootstrapDecisions {
  const included: Record<string, boolean> = {};
  for (const theme of draft.themes) {
    for (const c of theme.candidates) included[c.key] = c.confidence === "HIGH" && !c.existingArchived;
  }
  return { included, names: {}, excludedQuestions: {} };
}

export interface PlanItem {
  key: string;
  themeId: string;
  /** NEW면 생성할 이름, EXISTING이면 기존 이름 */
  name: string;
  existingConceptId?: string;
  sourceTagId: string;
}

export interface PlanLink {
  key: string;
  questionId: string;
  role: QuestionConceptRole;
}

export interface PlanError {
  key: string;
  message: string;
}

export interface BootstrapPlan {
  items: PlanItem[];
  links: PlanLink[];
  errors: PlanError[];
  summary: {
    newConcepts: number;
    existingConcepts: number;
    /** 이번에 새로 생길 QuestionConcept 수(이미 연결된 것은 제외) */
    newLinks: number;
    primaryLinks: number;
    secondaryLinks: number;
    alreadyLinked: number;
    /** 연결이 하나라도 생기는 문제 수 */
    questionsTouched: number;
  };
}

export interface PlanState {
  concepts: KnowledgeConcept[];
  links: QuestionConcept[];
}


export function effectiveName(candidate: ConceptCandidate, decisions: BootstrapDecisions): string {
  if (candidate.status === "EXISTING") return candidate.name;
  const edited = decisions.names[candidate.key];
  return cleanConceptName(edited ?? candidate.name);
}

/** 이름 검증(NEW 후보): 비어 있음 / 기존 개념과 같은 이름 / 같은 Theme에서 함께 만들어지는 다른 후보와 같은 이름. 문제가 없으면 null. */
export function validateCandidateName(
  candidate: ConceptCandidate,
  decisions: BootstrapDecisions,
  draft: BootstrapDraft,
  concepts: readonly KnowledgeConcept[],
): string | null {
  if (candidate.status === "EXISTING") return null;
  const name = effectiveName(candidate, decisions);
  const key = normalizeConceptName(name);
  if (!key) return "이름이 비어 있습니다.";
  const clash = concepts.find((c) => c.themeId === candidate.themeId && c.nameKey === key);
  if (clash) return clash.archived ? `보관된 개념 "${clash.name}"과(와) 같은 이름입니다.` : `이미 있는 개념 "${clash.name}"과(와) 같은 이름입니다.`;
  const theme = draft.themes.find((t) => t.themeId === candidate.themeId);
  const other = theme?.candidates.find(
    (c) => c.key !== candidate.key && c.status === "NEW" && decisions.included[c.key] && normalizeConceptName(effectiveName(c, decisions)) === key,
  );
  if (other) return `함께 만들어질 다른 후보 "${effectiveName(other, decisions)}"와(과) 같은 이름입니다.`;
  return null;
}

export function resolveBootstrapPlan(draft: BootstrapDraft, decisions: BootstrapDecisions, state: PlanState): BootstrapPlan {
  const items: PlanItem[] = [];
  const errors: PlanError[] = [];

  // 포함된 후보만 계획에 들어간다.
  const included: ConceptCandidate[] = [];
  for (const theme of draft.themes) {
    for (const c of theme.candidates) {
      if (!decisions.included[c.key]) continue;
      if (c.existingArchived) {
        errors.push({ key: c.key, message: "보관된 개념에는 문제를 연결할 수 없습니다. 개념을 복원하거나 제외하세요." });
        continue;
      }
      const problem = c.status === "NEW" && decisions.included[c.key] ? validateCandidateName(c, decisions, draft, state.concepts) : null;
      if (problem) {
        errors.push({ key: c.key, message: problem });
        continue;
      }
      included.push(c);
      items.push({ key: c.key, themeId: c.themeId, name: effectiveName(c, decisions), existingConceptId: c.existingConceptId, sourceTagId: c.sourceTagId });
    }
  }

  // 문제별로 어떤 후보가 어떤 증거로 연결되는지 모은다(문제 하나가 여러 후보에 걸릴 수 있다: M:N).
  const perQuestion = new Map<string, { key: string; tagEvidence: boolean }[]>();
  let alreadyLinked = 0;
  for (const c of included) {
    const skip = new Set(decisions.excludedQuestions[c.key] ?? []);
    for (const m of c.mappings) {
      if (skip.has(m.questionId)) continue;
      if (m.alreadyLinked) {
        alreadyLinked++;
        continue;
      }
      const list = perQuestion.get(m.questionId) ?? [];
      list.push({ key: c.key, tagEvidence: m.evidence !== "text" });
      perQuestion.set(m.questionId, list);
    }
  }

  // primary 정책(보수적): Tag 근거가 있는 후보가 정확히 하나이고, 문제에 이미 primary 개념이 없을 때만 그 연결을 primary로 둔다.
  // 근거가 비슷한 후보가 여럿이거나 본문 일치뿐이면 억지로 대표를 정하지 않고 모두 secondary로 둔다. 대표 개념은 나중에 문제 편집에서 정한다.
  const hasPrimary = new Set(state.links.filter((l) => l.role === "primary").map((l) => l.questionId));
  const links: PlanLink[] = [];
  for (const [questionId, entries] of perQuestion) {
    const tagged = entries.filter((e) => e.tagEvidence);
    const primaryKey = tagged.length === 1 && !hasPrimary.has(questionId) ? tagged[0].key : null;
    for (const e of entries) links.push({ key: e.key, questionId, role: e.key === primaryKey ? "primary" : "secondary" });
  }

  const primaryLinks = links.filter((l) => l.role === "primary").length;
  return {
    items,
    links,
    errors,
    summary: {
      newConcepts: items.filter((i) => !i.existingConceptId).length,
      existingConcepts: items.filter((i) => i.existingConceptId).length,
      newLinks: links.length,
      primaryLinks,
      secondaryLinks: links.length - primaryLinks,
      alreadyLinked,
      questionsTouched: perQuestion.size,
    },
  };
}
