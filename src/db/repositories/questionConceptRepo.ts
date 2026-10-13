import { db } from "@/db/db";
import type { KnowledgeConcept, QuestionConcept, QuestionConceptRole } from "@/types/knowledge";

export const questionConceptRepo = {
  listByQuestion(questionId: string): Promise<QuestionConcept[]> {
    return db.questionConcepts.where("questionId").equals(questionId).toArray();
  },

  listByConcept(conceptId: string): Promise<QuestionConcept[]> {
    return db.questionConcepts.where("conceptId").equals(conceptId).toArray();
  },

  /** 문제에 연결된 개념들(primary가 먼저). 보관된 개념은 기본으로 뺀다. */
  async listConceptsForQuestion(questionId: string, options?: { includeArchived?: boolean }): Promise<KnowledgeConcept[]> {
    const links = await db.questionConcepts.where("questionId").equals(questionId).toArray();
    links.sort((a, b) => Number(b.role === "primary") - Number(a.role === "primary"));
    const concepts = await db.knowledgeConcepts.bulkGet(links.map((l) => l.conceptId));
    return concepts.filter((c): c is KnowledgeConcept => !!c && (options?.includeArchived || !c.archived));
  },

  /**
   * Question ↔ Concept 연결(멱등). 이미 연결되어 있으면 role만 바꾼다.
   * 문제당 primary는 최대 하나다: 새 primary를 연결하면 기존 primary는 secondary로 내려간다(연결은 지우지 않는다).
   * 보관된 개념에는 새로 연결할 수 없다.
   */
  async connect(questionId: string, conceptId: string, role: QuestionConceptRole = "primary"): Promise<QuestionConcept> {
    return db.transaction("rw", db.questions, db.knowledgeConcepts, db.questionConcepts, async () => {
      if (!(await db.questions.get(questionId))) throw new Error("존재하지 않는 문제입니다.");
      const concept = await db.knowledgeConcepts.get(conceptId);
      if (!concept) throw new Error("존재하지 않는 개념입니다.");

      const existing = await db.questionConcepts.where("[questionId+conceptId]").equals([questionId, conceptId]).first();
      if (!existing && concept.archived) throw new Error("보관된 개념에는 문제를 연결할 수 없습니다.");

      if (role === "primary") {
        const primaries = await db.questionConcepts.where("questionId").equals(questionId).filter((l) => l.role === "primary" && l.conceptId !== conceptId).toArray();
        for (const p of primaries) await db.questionConcepts.update(p.id, { role: "secondary" });
      }

      if (existing) {
        if (existing.role !== role) await db.questionConcepts.update(existing.id, { role });
        return { ...existing, role };
      }
      const link: QuestionConcept = { id: crypto.randomUUID(), questionId, conceptId, role };
      await db.questionConcepts.add(link);
      return link;
    });
  },

  /** 연결 해제. 연결이 없었으면 false. 문제·개념·Attempt는 건드리지 않는다. */
  async disconnect(questionId: string, conceptId: string): Promise<boolean> {
    const removed = await db.questionConcepts.where("[questionId+conceptId]").equals([questionId, conceptId]).delete();
    return removed > 0;
  },
};
