import { db } from "@/db/db";
import { normalizeConceptName } from "@/lib/knowledge/conceptName";
import type { BootstrapInput } from "@/lib/knowledge/bootstrap/buildDraft";
import type { BootstrapPlan } from "@/lib/knowledge/bootstrap/resolvePlan";
import type { KnowledgeConcept, QuestionConcept } from "@/types/knowledge";

export interface ApplyBootstrapResult {
  createdConcepts: number;
  /** 이미 있어서 새로 만들지 않고 재사용한 개념 수(재실행/EXISTING) */
  reusedConcepts: number;
  createdLinks: number;
  /** 이미 연결되어 있거나 문제가 사라져서 건너뛴 연결 수 */
  skippedLinks: number;
  warnings: string[];
}

export const conceptBootstrapRepo = {
  /** 분석에 필요한 현재 데이터를 읽는다(읽기 전용). 보관된 개념도 포함한다. */
  async loadInput(): Promise<BootstrapInput> {
    const [themes, questions, tags, concepts, links] = await Promise.all([
      db.themes.toArray(),
      db.questions.toArray(),
      db.tags.toArray(),
      db.knowledgeConcepts.toArray(),
      db.questionConcepts.toArray(),
    ]);
    return { themes, questions, tags, concepts, links };
  },

  /**
   * 검토를 마친 계획을 하나의 트랜잭션으로 적용한다. 중간에 하나라도 실패하면 전부 롤백된다(개념이 일부만 생기지 않는다).
   * 변경하는 테이블은 knowledgeConcepts / questionConcepts뿐이다. Question·Tag·Theme·Attempt 등은 읽기만 한다.
   * 멱등: 같은 계획을 다시 적용해도 개념과 연결이 중복 생성되지 않는다(이미 있으면 재사용/건너뜀).
   * 적용 시점의 DB 상태를 다시 확인한다 — 검토하는 동안 상태가 바뀌었어도 안전하다.
   */
  async apply(plan: BootstrapPlan): Promise<ApplyBootstrapResult> {
    if (plan.errors.length > 0) throw new Error("해결되지 않은 오류가 있어 적용할 수 없습니다.");
    const result: ApplyBootstrapResult = { createdConcepts: 0, reusedConcepts: 0, createdLinks: 0, skippedLinks: 0, warnings: [] };

    await db.transaction("rw", db.themes, db.questions, db.knowledgeConcepts, db.questionConcepts, async () => {
      const conceptIdByKey = new Map<string, string>();
      const now = Date.now();

      for (const item of plan.items) {
        if (item.existingConceptId) {
          const existing = await db.knowledgeConcepts.get(item.existingConceptId);
          if (!existing) throw new Error(`기존 개념을 찾을 수 없습니다: ${item.name}`);
          if (existing.archived) {
            result.warnings.push(`보관된 개념 "${existing.name}"은(는) 건너뛰었습니다.`);
            continue;
          }
          conceptIdByKey.set(item.key, existing.id);
          result.reusedConcepts++;
          continue;
        }

        if (!(await db.themes.get(item.themeId))) throw new Error(`존재하지 않는 Theme입니다: ${item.name}`);
        const nameKey = normalizeConceptName(item.name);
        if (!nameKey) throw new Error("개념 이름이 비어 있습니다.");
        const found = await db.knowledgeConcepts.where("[themeId+nameKey]").equals([item.themeId, nameKey]).first();
        if (found) {
          if (found.archived) {
            result.warnings.push(`보관된 개념 "${found.name}"과(와) 이름이 같아 건너뛰었습니다.`);
            continue;
          }
          conceptIdByKey.set(item.key, found.id);
          result.reusedConcepts++;
          continue;
        }
        const concept: KnowledgeConcept = {
          id: crypto.randomUUID(),
          name: item.name,
          aliases: [],
          themeId: item.themeId,
          nameKey,
          origin: "tag-promoted",
          archived: false,
          createdAt: now,
          updatedAt: now,
        };
        await db.knowledgeConcepts.add(concept);
        conceptIdByKey.set(item.key, concept.id);
        result.createdConcepts++;
      }

      for (const link of plan.links) {
        const conceptId = conceptIdByKey.get(link.key);
        if (!conceptId || !(await db.questions.get(link.questionId))) {
          result.skippedLinks++;
          continue;
        }
        const existing = await db.questionConcepts.where("[questionId+conceptId]").equals([link.questionId, conceptId]).first();
        if (existing) {
          result.skippedLinks++; // 이미 있는 연결의 role은 바꾸지 않는다.
          continue;
        }
        // 적용 시점에 이미 primary가 있으면(검토 중에 바뀐 경우 포함) secondary로 내린다: 문제당 primary 최대 1개.
        let role = link.role;
        if (role === "primary") {
          const hasPrimary = (await db.questionConcepts.where("questionId").equals(link.questionId).toArray()).some((l) => l.role === "primary");
          if (hasPrimary) role = "secondary";
        }
        const row: QuestionConcept = { id: crypto.randomUUID(), questionId: link.questionId, conceptId, role };
        await db.questionConcepts.add(row);
        result.createdLinks++;
      }
    });
    return result;
  },
};
