// Attempt → 개념별 원시 학습 증거(순수 함수). 저장하지 않고 필요할 때 계산한다(Attempt가 원천).
// Historical Mastery / Memory Strength / Stage는 여기서 계산하지 않는다 — 다음 Phase에서 이 증거를 입력으로 쓴다.
import type { Attempt } from "@/types/domain";
import type { ConceptEvidence, ConceptStarInput, KnowledgeConcept, QuestionConcept } from "@/types/knowledge";

type AttemptLike = Pick<Attempt, "questionId" | "isCorrect" | "attemptedAt">;

/**
 * 개념마다 연결된 문제들의 Attempt를 집계한다.
 * - primary/secondary 모두 증거로 센다(복합 문제를 풀면 거기 연결된 개념 모두에 증거가 된다).
 * - 같은 (문제, 개념) 연결이 중복되어 있어도 문제는 한 번만 센다.
 * - 연결된 문제가 없거나 시도가 없는 개념도 항상 결과에 포함된다(0 / null).
 */
export function computeConceptEvidence(
  concepts: readonly Pick<KnowledgeConcept, "id">[],
  links: readonly Pick<QuestionConcept, "questionId" | "conceptId">[],
  attempts: readonly AttemptLike[],
): Map<string, ConceptEvidence> {
  const questionsByConcept = new Map<string, Set<string>>();
  for (const link of links) {
    let set = questionsByConcept.get(link.conceptId);
    if (!set) questionsByConcept.set(link.conceptId, (set = new Set()));
    set.add(link.questionId);
  }

  type Agg = { attempts: number; correct: number; last: number | null };
  const byQuestion = new Map<string, Agg>();
  for (const a of attempts) {
    const agg = byQuestion.get(a.questionId) ?? { attempts: 0, correct: 0, last: null };
    agg.attempts += 1;
    if (a.isCorrect) agg.correct += 1;
    agg.last = agg.last === null ? a.attemptedAt : Math.max(agg.last, a.attemptedAt);
    byQuestion.set(a.questionId, agg);
  }

  const result = new Map<string, ConceptEvidence>();
  for (const concept of concepts) {
    const questions = questionsByConcept.get(concept.id) ?? new Set<string>();
    let studied = 0;
    let attemptCount = 0;
    let correctCount = 0;
    let last: number | null = null;
    for (const questionId of questions) {
      const agg = byQuestion.get(questionId);
      if (!agg) continue;
      studied += 1;
      attemptCount += agg.attempts;
      correctCount += agg.correct;
      if (agg.last !== null) last = last === null ? agg.last : Math.max(last, agg.last);
    }
    result.set(concept.id, {
      conceptId: concept.id,
      linkedQuestionCount: questions.size,
      studiedQuestionCount: studied,
      attemptCount,
      correctCount,
      accuracy: attemptCount > 0 ? correctCount / attemptCount : null,
      lastStudiedAt: last,
    });
  }
  return result;
}

/**
 * KnowledgeConcept + 증거 → StarNode의 입력 필드. 위치/mastered/favorite은 만들지 않는다(다음 Phase).
 * Star identity는 concept.id 그대로다. 소속 Category는 Theme에서 파생한다(비정규화 금지).
 */
export function projectConceptToStarInput(
  concept: Pick<KnowledgeConcept, "id" | "name" | "themeId">,
  evidence: ConceptEvidence,
  categoryId: string,
): ConceptStarInput {
  return {
    id: concept.id,
    label: concept.name,
    categoryId,
    themeId: concept.themeId,
    questionCount: evidence.linkedQuestionCount,
    studiedCount: evidence.studiedQuestionCount,
    attemptCount: evidence.attemptCount,
    correctCount: evidence.correctCount,
    accuracy: evidence.accuracy,
    lastStudiedAt: evidence.lastStudiedAt,
  };
}
