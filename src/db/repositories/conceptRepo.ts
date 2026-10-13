import { db } from "@/db/db";
import { cleanAliases, cleanConceptName, normalizeConceptName } from "@/lib/knowledge/conceptName";
import { computeConceptEvidence } from "@/lib/knowledge/conceptEvidence";
import type { ConceptEvidence, ConceptOrigin, KnowledgeConcept } from "@/types/knowledge";

export interface CreateConceptInput {
  name: string;
  themeId: string;
  aliases?: string[];
  description?: string;
  origin?: ConceptOrigin;
}

export interface UpdateConceptPatch {
  name?: string;
  aliases?: string[];
  description?: string;
  themeId?: string;
}

/** 같은 Theme 안에 정규화된 이름이 같은 개념이 이미 있을 때(보관된 개념 포함). */
export class DuplicateConceptError extends Error {
  readonly existing: KnowledgeConcept;
  constructor(existing: KnowledgeConcept) {
    super(
      existing.archived
        ? `보관된 개념 "${existing.name}"이(가) 이미 있습니다. 새로 만들지 말고 복원하세요.`
        : `같은 Theme에 "${existing.name}" 개념이 이미 있습니다.`,
    );
    this.name = "DuplicateConceptError";
    this.existing = existing;
  }
}

async function findByNameKey(themeId: string, nameKey: string): Promise<KnowledgeConcept | undefined> {
  return db.knowledgeConcepts.where("[themeId+nameKey]").equals([themeId, nameKey]).first();
}

function requireValidName(name: string): string {
  const clean = cleanConceptName(name);
  if (!normalizeConceptName(clean)) throw new Error("개념 이름이 비어 있습니다.");
  return clean;
}

export const conceptRepo = {
  /** 기본은 보관되지 않은 개념만. */
  async list(options?: { includeArchived?: boolean }): Promise<KnowledgeConcept[]> {
    const all = await db.knowledgeConcepts.toArray();
    return options?.includeArchived ? all : all.filter((c) => !c.archived);
  },

  get(id: string): Promise<KnowledgeConcept | undefined> {
    return db.knowledgeConcepts.get(id);
  },

  async listByTheme(themeId: string, options?: { includeArchived?: boolean }): Promise<KnowledgeConcept[]> {
    const rows = await db.knowledgeConcepts.where("themeId").equals(themeId).toArray();
    return (options?.includeArchived ? rows : rows.filter((c) => !c.archived)).sort(
      (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
    );
  },

  /** 같은 Theme에서 이름(정규화) 또는 alias가 text와 완전히 같은 개념 후보. 자동 병합의 근거가 아니라 UI가 "이미 있나요?"를 물을 때 쓴다. */
  async findMatches(themeId: string, text: string): Promise<KnowledgeConcept[]> {
    const key = normalizeConceptName(text);
    if (!key) return [];
    const rows = await db.knowledgeConcepts.where("themeId").equals(themeId).toArray();
    return rows.filter((c) => c.nameKey === key || c.aliases.some((a) => normalizeConceptName(a) === key));
  },

  /**
   * 개념 생성. 같은 Theme에 정규화된 이름이 같은 개념(보관 포함)이 있으면 DuplicateConceptError.
   * 다른 Theme의 같은 이름은 다른 개념이다(Python groupby ≠ SQL GROUP BY).
   */
  async create(input: CreateConceptInput): Promise<KnowledgeConcept> {
    const name = requireValidName(input.name);
    const nameKey = normalizeConceptName(name);
    const now = Date.now();
    const concept: KnowledgeConcept = {
      id: crypto.randomUUID(),
      name,
      aliases: cleanAliases(input.aliases ?? [], name),
      themeId: input.themeId,
      nameKey,
      description: input.description?.trim() || undefined,
      origin: input.origin ?? "user",
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    await db.transaction("rw", db.themes, db.knowledgeConcepts, async () => {
      if (!(await db.themes.get(input.themeId))) throw new Error("존재하지 않는 Theme입니다.");
      const existing = await findByNameKey(input.themeId, nameKey);
      if (existing) throw new DuplicateConceptError(existing);
      await db.knowledgeConcepts.add(concept);
    });
    return concept;
  },

  /** 이름/별칭/설명/소속 Theme 수정. id는 바뀌지 않으므로 연결과 별의 identity가 유지된다. */
  async update(id: string, patch: UpdateConceptPatch): Promise<KnowledgeConcept> {
    return db.transaction("rw", db.themes, db.knowledgeConcepts, async () => {
      const current = await db.knowledgeConcepts.get(id);
      if (!current) throw new Error("존재하지 않는 개념입니다.");
      const name = patch.name === undefined ? current.name : requireValidName(patch.name);
      const themeId = patch.themeId ?? current.themeId;
      const nameKey = normalizeConceptName(name);
      if (themeId !== current.themeId && !(await db.themes.get(themeId))) throw new Error("존재하지 않는 Theme입니다.");
      if (nameKey !== current.nameKey || themeId !== current.themeId) {
        const clash = await findByNameKey(themeId, nameKey);
        if (clash && clash.id !== id) throw new DuplicateConceptError(clash);
      }
      const next: KnowledgeConcept = {
        ...current,
        name,
        nameKey,
        themeId,
        aliases: cleanAliases(patch.aliases ?? current.aliases, name),
        description: patch.description === undefined ? current.description : patch.description.trim() || undefined,
        updatedAt: Date.now(),
      };
      await db.knowledgeConcepts.put(next);
      return next;
    });
  },

  /** 보관: 목록/하늘에서 빠지지만 id와 Question 연결, 학습 증거는 그대로 남는다. */
  async archive(id: string): Promise<void> {
    const updated = await db.knowledgeConcepts.update(id, { archived: true, updatedAt: Date.now() });
    if (updated === 0) throw new Error("존재하지 않는 개념입니다.");
  },

  async unarchive(id: string): Promise<void> {
    const updated = await db.knowledgeConcepts.update(id, { archived: false, updatedAt: Date.now() });
    if (updated === 0) throw new Error("존재하지 않는 개념입니다.");
  },

  /** 개념 하나의 원시 학습 증거(저장하지 않고 Attempt에서 계산). */
  async getEvidence(id: string): Promise<ConceptEvidence | undefined> {
    const concept = await db.knowledgeConcepts.get(id);
    if (!concept) return undefined;
    return (await conceptRepo.listEvidence({ conceptIds: [id] })).get(id);
  },

  /**
   * 여러 개념의 원시 학습 증거. 기본은 보관되지 않은 모든 개념.
   * 연결된 문제의 Attempt만 읽는다(연결이 없는 문제의 Attempt는 읽지 않는다).
   */
  async listEvidence(options?: { conceptIds?: string[]; themeId?: string }): Promise<Map<string, ConceptEvidence>> {
    let concepts: KnowledgeConcept[];
    if (options?.conceptIds) {
      concepts = (await db.knowledgeConcepts.bulkGet(options.conceptIds)).filter((c): c is KnowledgeConcept => !!c);
    } else if (options?.themeId) {
      concepts = await conceptRepo.listByTheme(options.themeId);
    } else {
      concepts = await conceptRepo.list();
    }
    const conceptIds = concepts.map((c) => c.id);
    const links = conceptIds.length ? await db.questionConcepts.where("conceptId").anyOf(conceptIds).toArray() : [];
    const questionIds = [...new Set(links.map((l) => l.questionId))];
    const attempts = questionIds.length ? await db.attempts.where("questionId").anyOf(questionIds).toArray() : [];
    return computeConceptEvidence(concepts, links, attempts);
  },
};
