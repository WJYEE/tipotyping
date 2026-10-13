// Concept Bootstrap 분석: 기존 Learning 데이터(Theme / Question / Tag)와 이미 있는 KnowledgeConcept로부터
// "어떤 개념이 있을 가능성이 높은가, 어떤 문제가 거기에 연결될 가능성이 높은가"의 초안(Draft)을 만든다.
//
// 순수 함수다: DB를 읽지도 쓰지도 않고, AI/외부 API/임베딩도 쓰지 않는다. Draft는 저장되지 않는다.
// Tag는 후보를 만드는 "증거"일 뿐 개념 자체가 아니다. 확실하지 않으면 자동 승격하지 않고 REVIEW로 둔다.
import { cleanConceptName, normalizeConceptName } from "@/lib/knowledge/conceptName";
import { matchMetaTag, type MetaTagKind } from "@/lib/knowledge/bootstrap/metaTagRules";
import { prepareText, questionEvidenceText, textMentions, type PreparedText } from "@/lib/knowledge/bootstrap/questionText";
import type { Question, Tag, Theme } from "@/types/domain";
import type { KnowledgeConcept, QuestionConcept } from "@/types/knowledge";

/**
 * 모든 임계값은 여기 한 곳에 둔다. 번들 문제은행 실측(문제 1,713개, Tag의 약 절반이 문제 1개짜리, Theme 이름 Tag가 거의 모든 문제에 붙음)에 맞춘
 * 보수적인 값이며 통계적으로 보정된 확률이 아니다 — 그래서 UI도 HIGH / REVIEW 두 상태만 쓴다.
 */
export const BOOTSTRAP_THRESHOLDS = {
  /** 후보가 되려면 Tag가 붙은 문제가 최소 몇 개여야 하는가(이미 같은 이름의 개념이 있으면 1개도 허용) */
  minQuestions: 2,
  /** HIGH가 되려면 최소 몇 개의 문제가 필요한가 */
  highMinQuestions: 3,
  /** Theme 문제의 이 비율 이상에 붙은 Tag는 Theme 자체를 가리키는 broad Tag로 보고 후보에서 제외 */
  themeBroadShare: 0.85,
  /** broad 판정은 Theme에 문제가 이 개수 이상일 때만(작은 Theme에서는 우연히 높아지기 쉽다) */
  themeBroadMinQuestions: 4,
  /** Theme 문제의 이 비율을 넘는 Tag는 별 하나로 보기엔 범위가 넓다 → REVIEW */
  broadTopicShare: 0.3,
  /** HIGH가 되려면 Tag가 붙은 문제 중 이 비율 이상의 본문에 용어가 실제로 등장해야 한다 */
  highTextRatio: 0.6,
  /** 이 개수 이상의 서로 다른 Theme에 쓰인 Tag는 일반어(보안, 지표계산 …)로 보고 제외 */
  genericThemeSpread: 4,
  /** 3개 Theme에 쓰인 Tag는 후보로 두되 REVIEW */
  crossThemeSpread: 3,
  /** Tag가 안 붙은 문제를 본문 일치만으로 연결할 때, 일치 수가 Tag 문제 수의 이 배수를 넘으면 용어가 너무 흔한 것으로 보고 연결하지 않는다 */
  textOnlyMaxRatio: 2,
} as const;

export type CandidateConfidence = "HIGH" | "REVIEW";
export type CandidateStatus = "NEW" | "EXISTING";

/** REVIEW인 이유 / 주의 사항 */
export type ReviewReason =
  | "broad-topic" // Theme 문제의 상당 부분에 붙은 넓은 주제
  | "low-text-evidence" // 문제 본문에서 용어가 잘 확인되지 않음
  | "few-questions" // 연결될 문제가 적음
  | "cross-theme" // 여러 Theme에서 쓰이는 Tag
  | "alias-match" // 이미 있는 개념의 별칭과 같은 이름
  | "existing-archived"; // 보관된 개념과 이름이 같음

export type MappingEvidence = "tag" | "text" | "tag+text";

export interface DraftMapping {
  questionId: string;
  evidence: MappingEvidence;
  /** 이미 이 개념에 연결되어 있음(적용해도 새 연결이 생기지 않는다) */
  alreadyLinked: boolean;
}

export interface CandidateStats {
  /** Tag가 붙은 문제 수 */
  taggedCount: number;
  /** 그중 본문에도 용어가 등장하는 문제 수 */
  textMatchedTagged: number;
  /** Tag는 없지만 본문에 용어가 등장해 연결 후보가 된 문제 수 */
  textOnlyCount: number;
  /** Theme 문제 중 Tag가 붙은 비율 0~1 */
  themeShare: number;
  /** Tag가 쓰인 서로 다른 Theme 수 */
  themeSpread: number;
}

export interface ConceptCandidate {
  /** `${themeId}::${tagId}` — 같은 데이터에서는 항상 같은 키 */
  key: string;
  themeId: string;
  sourceTagId: string;
  /** 제안 이름(= Tag 이름을 정리한 것). 검토 중 바꿀 수 있다. */
  name: string;
  status: CandidateStatus;
  existingConceptId?: string;
  existingArchived?: boolean;
  /** 이 이름이 이미 있는 개념의 별칭과 같을 때 그 개념(자동 병합하지 않는다) */
  aliasOfConceptId?: string;
  confidence: CandidateConfidence;
  reasons: ReviewReason[];
  mappings: DraftMapping[];
  stats: CandidateStats;
}

export type ExcludedTagReason = "meta" | "theme-broad" | "generic";

export interface ExcludedTag {
  tagId: string;
  name: string;
  questionCount: number;
  reason: ExcludedTagReason;
  /** 사람이 읽을 이유 */
  detail: string;
  metaKind?: MetaTagKind;
}

export interface ThemeDraft {
  themeId: string;
  themeName: string;
  categoryId: string;
  questionCount: number;
  candidates: ConceptCandidate[];
  excludedTags: ExcludedTag[];
  /** 문제가 1개뿐이라 후보로 올리지 않은 Tag 수(개별 나열하지 않는다) */
  tooFewCount: number;
}

export interface BootstrapDraft {
  themes: ThemeDraft[];
  /** 문제가 하나도 없어 분석하지 않은 Theme 수 */
  emptyThemeCount: number;
  totals: { candidates: number; high: number; review: number; existing: number; mappings: number };
}

export interface BootstrapInput {
  themes: Theme[];
  questions: Question[];
  tags: Tag[];
  /** 보관된 개념도 포함해야 한다(이름 충돌 검사) */
  concepts: KnowledgeConcept[];
  links: QuestionConcept[];
}

const SEP = "\u0000";

export function candidateKey(themeId: string, tagId: string): string {
  return `${themeId}::${tagId}`;
}

export function buildBootstrapDraft(input: BootstrapInput): BootstrapDraft {
  const T = BOOTSTRAP_THRESHOLDS;
  const tagById = new Map(input.tags.map((t) => [t.id, t]));

  // Tag가 쓰인 Theme 수(전역 통계): 여러 Theme에 반복되는 Tag는 개념보다 일반어/절차 표시일 가능성이 높다.
  const tagThemes = new Map<string, Set<string>>();
  const questionsByTheme = new Map<string, Question[]>();
  for (const q of input.questions) {
    (questionsByTheme.get(q.themeId) ?? questionsByTheme.set(q.themeId, []).get(q.themeId)!).push(q);
    for (const tagId of q.tagIds) {
      (tagThemes.get(tagId) ?? tagThemes.set(tagId, new Set()).get(tagId)!).add(q.themeId);
    }
  }

  const conceptByThemeKey = new Map<string, KnowledgeConcept>();
  const conceptByAlias = new Map<string, KnowledgeConcept>();
  for (const c of input.concepts) {
    conceptByThemeKey.set(`${c.themeId}${SEP}${c.nameKey}`, c);
    for (const alias of c.aliases) conceptByAlias.set(`${c.themeId}${SEP}${normalizeConceptName(alias)}`, c);
  }
  const linkedPairs = new Set(input.links.map((l) => `${l.questionId}${SEP}${l.conceptId}`));

  const preparedByQuestion = new Map<string, PreparedText>();
  const prepared = (q: Question): PreparedText => {
    let p = preparedByQuestion.get(q.id);
    if (!p) preparedByQuestion.set(q.id, (p = prepareText(questionEvidenceText(q))));
    return p;
  };

  const themeDrafts: ThemeDraft[] = [];
  let emptyThemeCount = 0;

  for (const theme of [...input.themes].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))) {
    const qs = questionsByTheme.get(theme.id) ?? [];
    if (qs.length === 0) {
      emptyThemeCount++;
      continue;
    }

    const byTag = new Map<string, Question[]>();
    for (const q of qs) {
      for (const tagId of new Set(q.tagIds)) {
        (byTag.get(tagId) ?? byTag.set(tagId, []).get(tagId)!).push(q);
      }
    }

    const candidates: ConceptCandidate[] = [];
    const excludedTags: ExcludedTag[] = [];
    let tooFewCount = 0;
    const themeKey = normalizeConceptName(theme.name);

    for (const [tagId, taggedQs] of byTag) {
      const tag = tagById.get(tagId);
      if (!tag) continue; // 존재하지 않는 Tag id(데이터 불일치)는 무시한다.
      const name = cleanConceptName(tag.name);
      const nameKey = normalizeConceptName(name);
      if (!nameKey) continue;

      const share = taggedQs.length / qs.length;
      const spread = tagThemes.get(tagId)?.size ?? 1;

      // ── 후보에서 제외: 개념이 아닐 가능성이 높은 Tag ──
      const meta = matchMetaTag(name);
      if (meta) {
        excludedTags.push({ tagId, name, questionCount: taggedQs.length, reason: "meta", detail: meta.why, metaKind: meta.kind });
        continue;
      }
      if (nameKey === themeKey || (qs.length >= T.themeBroadMinQuestions && share >= T.themeBroadShare)) {
        excludedTags.push({
          tagId,
          name,
          questionCount: taggedQs.length,
          reason: "theme-broad",
          detail: `Theme 전체를 가리키는 Tag (${Math.round(share * 100)}%의 문제에 붙음)`,
        });
        continue;
      }
      if (spread >= T.genericThemeSpread) {
        excludedTags.push({
          tagId,
          name,
          questionCount: taggedQs.length,
          reason: "generic",
          detail: `${spread}개 Theme에 쓰이는 일반 Tag`,
        });
        continue;
      }

      const existing = conceptByThemeKey.get(`${theme.id}${SEP}${nameKey}`);
      const aliasOf = existing ? undefined : conceptByAlias.get(`${theme.id}${SEP}${nameKey}`);
      if (!existing && taggedQs.length < T.minQuestions) {
        tooFewCount++;
        continue;
      }

      // ── 증거: 본문에 용어가 실제로 등장하는가 ──
      const taggedIds = new Set(taggedQs.map((q) => q.id));
      const textMatchedTagged = taggedQs.filter((q) => textMentions(prepared(q), name)).length;
      const textRatio = textMatchedTagged / taggedQs.length;

      const reasons: ReviewReason[] = [];
      if (taggedQs.length < T.highMinQuestions) reasons.push("few-questions");
      if (share > T.broadTopicShare) reasons.push("broad-topic");
      if (textRatio < T.highTextRatio) reasons.push("low-text-evidence");
      if (spread >= T.crossThemeSpread) reasons.push("cross-theme");
      if (aliasOf) reasons.push("alias-match");
      if (existing?.archived) reasons.push("existing-archived");

      // 이미 사용자가 만든 개념과 이름이 같으면 "연결 추가"일 뿐이라 문제 수가 적어도 허용한다(few-questions는 주의 사항에서 제외).
      const effective = existing && !existing.archived ? reasons.filter((r) => r !== "few-questions") : reasons;
      const confidence: CandidateConfidence = effective.length === 0 ? "HIGH" : "REVIEW";

      // ── 문제 연결 후보 ──
      const mappings: DraftMapping[] = taggedQs.map((q) => ({
        questionId: q.id,
        evidence: textMentions(prepared(q), name) ? "tag+text" : "tag",
        alreadyLinked: existing ? linkedPairs.has(`${q.id}${SEP}${existing.id}`) : false,
      }));
      let textOnlyCount = 0;
      if (confidence === "HIGH") {
        // Tag가 없어도 본문에 용어가 정확히 등장하는 같은 Theme의 문제. 용어가 너무 흔하면(일치가 지나치게 많으면) 연결하지 않는다.
        const textOnly = qs.filter((q) => !taggedIds.has(q.id) && textMentions(prepared(q), name));
        if (textOnly.length <= taggedQs.length * T.textOnlyMaxRatio) {
          for (const q of textOnly) {
            mappings.push({ questionId: q.id, evidence: "text", alreadyLinked: existing ? linkedPairs.has(`${q.id}${SEP}${existing.id}`) : false });
          }
          textOnlyCount = textOnly.length;
        }
      }

      candidates.push({
        key: candidateKey(theme.id, tagId),
        themeId: theme.id,
        sourceTagId: tagId,
        name,
        status: existing ? "EXISTING" : "NEW",
        existingConceptId: existing?.id,
        existingArchived: existing?.archived || undefined,
        aliasOfConceptId: aliasOf?.id,
        confidence,
        reasons,
        mappings,
        stats: { taggedCount: taggedQs.length, textMatchedTagged, textOnlyCount, themeShare: share, themeSpread: spread },
      });
    }

    candidates.sort(
      (a, b) =>
        Number(b.confidence === "HIGH") - Number(a.confidence === "HIGH") ||
        b.stats.taggedCount - a.stats.taggedCount ||
        a.name.localeCompare(b.name),
    );
    excludedTags.sort((a, b) => b.questionCount - a.questionCount || a.name.localeCompare(b.name));

    themeDrafts.push({
      themeId: theme.id,
      themeName: theme.name,
      categoryId: theme.categoryId,
      questionCount: qs.length,
      candidates,
      excludedTags,
      tooFewCount,
    });
  }

  const all = themeDrafts.flatMap((t) => t.candidates);
  return {
    themes: themeDrafts,
    emptyThemeCount,
    totals: {
      candidates: all.length,
      high: all.filter((c) => c.confidence === "HIGH").length,
      review: all.filter((c) => c.confidence === "REVIEW").length,
      existing: all.filter((c) => c.status === "EXISTING").length,
      mappings: all.reduce((n, c) => n + c.mappings.length, 0),
    },
  };
}
