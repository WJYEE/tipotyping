import { db } from "@/db/db";
import { KB_BRIDGE_CATEGORY_ID, kbBridgeThemeId } from "@/lib/packages/definitions";
import type { KbBridgeBundle } from "@/lib/packages/kbBridgeBundle";
import type { Question } from "@/types/domain";
import type {
  ConceptNote,
  DerivedQuestion,
  Memo,
  MemoLink,
  PackageContentKind,
  PackageContentMapping,
  PackageId,
  PracticeTask,
  ResourceLink,
} from "@/types/package";

export const KB_BRIDGE_IMPORT_KEY = "package.kb-bridge.import";
/** 가져오기 로직/콘텐츠 형식이 바뀌면 올린다. 같은 버전을 다시 가져와도 결과는 같다(멱등). */
export const KB_BRIDGE_CONTENT_VERSION = 2;

export interface KbBridgeImportState {
  version: number;
  importedAt: number;
  counts: Record<string, number>;
}

export interface KindResult {
  added: number;
  existing: number;
}

export interface KbBridgeImportResult {
  questions: KindResult;
  derived: KindResult;
  concepts: KindResult;
  tasks: KindResult;
  memos: KindResult;
  resources: KindResult;
  issues: KbBridgeBundle["issues"];
}

export function mappingId(packageId: PackageId, kind: PackageContentKind, contentId: string): string {
  return `${packageId}:${kind}:${contentId}`;
}

function mapping(
  packageId: PackageId,
  kind: PackageContentKind,
  contentId: string,
  categoryKey?: string,
): PackageContentMapping {
  return { id: mappingId(packageId, kind, contentId), packageId, kind, contentId, categoryKey };
}

async function contentIds(packageId: PackageId, kind: PackageContentKind): Promise<string[]> {
  const rows = await db.packageContentMap.where("[packageId+kind]").equals([packageId, kind]).toArray();
  return rows.map((r) => r.contentId);
}

async function loadByMapping<T>(
  packageId: PackageId,
  kind: PackageContentKind,
  table: { bulkGet(ids: string[]): Promise<(T | undefined)[]> },
): Promise<T[]> {
  const ids = await contentIds(packageId, kind);
  const rows = await table.bulkGet(ids);
  return rows.filter((r): r is T => r !== undefined);
}

export const packageRepo = {
  async getKbBridgeImportState(): Promise<KbBridgeImportState | undefined> {
    const row = await db.settings.get(KB_BRIDGE_IMPORT_KEY);
    return row?.value as KbBridgeImportState | undefined;
  },

  /**
   * 검증된 KB-Bridge 번들을 DB에 반영한다. 명시적 사용자 동작으로만 호출한다(앱 시작 시 자동 seed 아님).
   * - id가 결정적(kbb-...)이라 여러 번 실행해도 중복이 생기지 않는다.
   * - 이미 있는 문제·직접 편집한 메모는 덮어쓰지 않는다. 풀이 기록(QuestionRecord/Attempt)과 실습 완료 표시도 보존한다.
   * - 기존 Category/Theme/Question은 건드리지 않고, 전부 한 트랜잭션이라 중간에 실패하면 아무것도 바뀌지 않는다.
   */
  async importKbBridge(bundle: KbBridgeBundle): Promise<KbBridgeImportResult> {
    const result: KbBridgeImportResult = {
      questions: { added: 0, existing: 0 },
      derived: { added: 0, existing: 0 },
      concepts: { added: 0, existing: 0 },
      tasks: { added: 0, existing: 0 },
      memos: { added: 0, existing: 0 },
      resources: { added: 0, existing: 0 },
      issues: bundle.issues,
    };
    const pkg: PackageId = "kb-bridge";

    await db.transaction(
      "rw",
      [
        db.categories,
        db.themes,
        db.tags,
        db.questions,
        db.questionRecords,
        db.packageContentMap,
        db.derivedQuestions,
        db.conceptNotes,
        db.practiceTasks,
        db.memos,
        db.resourceLinks,
        db.settings,
      ],
      async () => {
        const now = Date.now();
        const maps: PackageContentMapping[] = [];

        // Category / Theme (없을 때만 생성)
        if (!(await db.categories.get(KB_BRIDGE_CATEGORY_ID))) {
          const maxOrder = (await db.categories.orderBy("order").last())?.order ?? 0;
          await db.categories.add({
            id: KB_BRIDGE_CATEGORY_ID,
            name: "KB-Bridge",
            order: maxOrder + 1,
            isCustom: true,
          });
        }
        for (const c of bundle.categories) {
          const themeId = kbBridgeThemeId(c.id);
          if (await db.themes.get(themeId)) continue;
          await db.themes.add({
            id: themeId,
            categoryId: KB_BRIDGE_CATEGORY_ID,
            name: `KB · ${c.name}`,
            order: 1000 + c.sortOrder,
            isCustom: true,
            useDifficulty: true,
          });
        }

        // Tag (이름이 같으면 기존 Tag 재사용)
        const tagIdByName = new Map((await db.tags.toArray()).map((t) => [t.name, t.id]));
        const newTags: { id: string; name: string }[] = [];
        for (const name of new Set(bundle.questions.flatMap((q) => q.tags))) {
          if (tagIdByName.has(name)) continue;
          const id = crypto.randomUUID();
          tagIdByName.set(name, id);
          newTags.push({ id, name });
        }
        await db.tags.bulkAdd(newTags);

        // 문제 (이미 있으면 그대로 둔다 — 사용자의 메모/즐겨찾기/플래그 보존)
        const existingQuestionIds = new Set(
          (await db.questions.bulkGet(bundle.questions.map((q) => q.id))).filter(Boolean).map((q) => q!.id),
        );
        const existingRecordIds = new Set(
          (await db.questionRecords.bulkGet(bundle.questions.map((q) => q.id))).filter(Boolean).map((r) => r!.questionId),
        );
        const newQuestions: Question[] = [];
        for (const q of bundle.questions) {
          maps.push(mapping(pkg, "question", q.id, q.categoryKey));
          if (existingQuestionIds.has(q.id)) {
            result.questions.existing++;
            continue;
          }
          newQuestions.push({
            id: q.id,
            displayCode: q.displayCode,
            categoryId: KB_BRIDGE_CATEGORY_ID,
            themeId: kbBridgeThemeId(q.categoryKey),
            tagIds: q.tags.map((t) => tagIdByName.get(t)!),
            difficulty: q.difficulty,
            explanation: q.explanation,
            flagged: false,
            favorite: false,
            reviewStatus: q.reviewStatus,
            createdAt: now + newQuestions.length,
            updatedAt: now,
            type: "multiple-choice",
            payload: q.payload,
          });
          result.questions.added++;
        }
        await db.questions.bulkAdd(newQuestions);
        await db.questionRecords.bulkAdd(
          newQuestions
            .filter((q) => !existingRecordIds.has(q.id))
            .map((q) => ({
              questionId: q.id,
              totalAttempts: 0,
              correctCount: 0,
              wrongCount: 0,
              lastResult: null,
              lastAttemptAt: null,
            })),
        );

        // 파생질문 / 개념 정리 / 실습 과제: 번들 내용으로 갱신하되, 바뀐 행만 쓴다.
        // 실습 과제는 사용자의 완료 표시를 유지한다.
        const putChanged = async <T extends { id: string }>(
          rows: T[],
          table: { bulkGet(ids: string[]): Promise<(T | undefined)[]>; bulkPut(rows: T[]): Promise<unknown> },
          stat: KindResult,
          prepare: (row: T, prev: T | undefined) => T = (row) => row,
        ) => {
          const prevRows = await table.bulkGet(rows.map((r) => r.id));
          const changed: T[] = [];
          rows.forEach((row, i) => {
            const prev = prevRows[i];
            const next = prepare(row, prev);
            if (!prev) stat.added++;
            else stat.existing++;
            if (!prev || JSON.stringify(prev) !== JSON.stringify(next)) changed.push(next);
          });
          await table.bulkPut(changed);
        };
        for (const d of bundle.derived) maps.push(mapping(pkg, "derived", d.id, d.categoryKey));
        for (const c of bundle.concepts) maps.push(mapping(pkg, "concept", c.id, c.categoryKey));
        for (const t of bundle.tasks) maps.push(mapping(pkg, "task", t.id, t.categoryKey));
        await putChanged<DerivedQuestion>(bundle.derived, db.derivedQuestions, result.derived);
        await putChanged<ConceptNote>(bundle.concepts, db.conceptNotes, result.concepts);
        await putChanged<PracticeTask>(
          bundle.tasks.map((t) => ({ ...t, completedAt: null })),
          db.practiceTasks,
          result.tasks,
          (row, prev) => ({ ...row, completedAt: prev?.completedAt ?? null }),
        );

        // 메모·추천 사이트: 이미 있으면 건드리지 않는다(사용자가 고친 내용 보존)
        const existingMemos = new Set((await db.memos.bulkGet(bundle.memos.map((m) => m.id))).filter(Boolean).map((m) => m!.id));
        const newMemos: Memo[] = [];
        for (const m of bundle.memos) {
          maps.push(mapping(pkg, "memo", m.id));
          if (existingMemos.has(m.id)) {
            result.memos.existing++;
            continue;
          }
          newMemos.push({ ...m, createdAt: now, updatedAt: now });
          result.memos.added++;
        }
        await db.memos.bulkAdd(newMemos);

        const existingResources = new Set((await db.resourceLinks.bulkGet(bundle.resources.map((r) => r.id))).filter(Boolean).map((r) => r!.id));
        const newResources = bundle.resources.filter((r) => {
          maps.push(mapping(pkg, "resource", r.id));
          if (existingResources.has(r.id)) {
            result.resources.existing++;
            return false;
          }
          result.resources.added++;
          return true;
        });
        await db.resourceLinks.bulkAdd(newResources);

        const knownMaps = new Set(
          (await db.packageContentMap.bulkGet(maps.map((m) => m.id))).filter(Boolean).map((m) => m!.id),
        );
        await db.packageContentMap.bulkAdd(maps.filter((m) => !knownMaps.has(m.id)));

        const state: KbBridgeImportState = {
          version: KB_BRIDGE_CONTENT_VERSION,
          importedAt: now,
          counts: {
            questions: bundle.questions.length,
            derived: bundle.derived.length,
            concepts: bundle.concepts.length,
            tasks: bundle.tasks.length,
            memos: bundle.memos.length,
            resources: bundle.resources.length,
            issues: bundle.issues.length,
          },
        };
        await db.settings.put({ id: KB_BRIDGE_IMPORT_KEY, value: state });
      },
    );

    return result;
  },

  listQuestions(packageId: PackageId): Promise<Question[]> {
    return loadByMapping<Question>(packageId, "question", db.questions);
  },
  listDerived(packageId: PackageId): Promise<DerivedQuestion[]> {
    return loadByMapping<DerivedQuestion>(packageId, "derived", db.derivedQuestions);
  },
  listConcepts(packageId: PackageId): Promise<ConceptNote[]> {
    return loadByMapping<ConceptNote>(packageId, "concept", db.conceptNotes);
  },
  listTasks(packageId: PackageId): Promise<PracticeTask[]> {
    return loadByMapping<PracticeTask>(packageId, "task", db.practiceTasks);
  },
  async listMemos(packageId: PackageId): Promise<Memo[]> {
    const rows = await loadByMapping<Memo>(packageId, "memo", db.memos);
    return rows.sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
  },
  listResources(packageId: PackageId): Promise<ResourceLink[]> {
    return loadByMapping<ResourceLink>(packageId, "resource", db.resourceLinks);
  },

  async setTaskCompleted(id: string, completed: boolean): Promise<void> {
    await db.practiceTasks.update(id, { completedAt: completed ? Date.now() : null });
  },

  /** 사용자 메모 추가. 번들 메모와 구분되도록 origin: user, 재가져오기 영향을 받지 않는다. */
  async createMemo(
    packageId: PackageId,
    data: { category: string; title: string; body: string; tags?: string[]; source?: string; links?: MemoLink[] },
  ): Promise<Memo> {
    const now = Date.now();
    const memo: Memo = {
      id: `user-memo-${crypto.randomUUID()}`,
      category: data.category.trim() || "기타",
      title: data.title.trim(),
      body: data.body.trim(),
      tags: data.tags ?? [],
      source: data.source?.trim() ?? "",
      verified: false,
      links: data.links ?? [],
      origin: "user",
      createdAt: now,
      updatedAt: now,
    };
    await db.transaction("rw", db.memos, db.packageContentMap, async () => {
      await db.memos.add(memo);
      await db.packageContentMap.put(mapping(packageId, "memo", memo.id));
    });
    return memo;
  },

  /** 수정하면 origin을 user로 바꿔 이후 재가져오기가 덮어쓰지 못하게 한다. */
  async updateMemo(
    id: string,
    patch: Partial<Pick<Memo, "category" | "title" | "body" | "tags" | "source" | "links">>,
  ): Promise<void> {
    await db.memos.update(id, { ...patch, origin: "user", updatedAt: Date.now() });
  },

  async removeMemo(id: string): Promise<void> {
    await db.transaction("rw", db.memos, db.packageContentMap, async () => {
      await db.memos.delete(id);
      await db.packageContentMap.where("contentId").equals(id).filter((m) => m.kind === "memo").delete();
    });
  },
};
