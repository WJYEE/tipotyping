import { db } from "@/db/db";
import {
  getDefaultContentState,
  putDefaultContentState,
  seedContentHash,
  stableStringify,
  type DefaultContentState,
} from "@/db/seed/defaultContentState";
import { defaultCategories } from "@/db/seed/defaultCategories";
import { DEFAULT_CONTENT_VERSION, defaultQuestions, type SeedQuestion } from "@/db/seed/defaultQuestions";
import { DEFAULT_THEME_PREFIXES, generateDisplayCode } from "@/lib/displayCode";
import type { Category, Question, QuestionRecord, Tag, Theme } from "@/types/domain";

/** 기본 Theme의 고정 식별자. displayCode 접두어와 같은 값을 쓴다 (예: 자료구조 → DS). */
export function themeSeedKey(themeName: string): string {
  const key = DEFAULT_THEME_PREFIXES[themeName];
  if (!key) throw new Error(`기본 Theme 접두어가 정의되지 않았습니다: ${themeName}`);
  return key;
}

function toSeedContent(q: SeedQuestion) {
  return {
    type: q.type,
    payload: q.payload,
    explanation: q.explanation,
    difficulty: q.difficulty,
    tagNames: q.tagNames,
  };
}

/** 번들 전체 내용 해시. 번들이 바뀌었는지 판단하는 데 쓴다. */
export function computeBundleHash(): string {
  return seedContentHash({
    type: "essay",
    payload: { prompt: "bundle", answer: stableStringify([defaultCategories, defaultQuestions]) },
    tagNames: [],
  });
}

export interface SyncResult {
  skipped: boolean;
  createdThemes: number;
  linked: number;
  added: number;
  updated: number;
  keptUserModified: number;
}

/**
 * 번들 기본 문제은행(defaultCategories + defaultQuestions)을 사용자 DB와 동기화한다. 앱 시작 시 매번 호출한다.
 *
 * - 빈 DB: 기본 Category/Theme과 모든 기본 문제를 만든다(최초 설치).
 * - 기존 DB: 사용자 데이터는 삭제하지 않고 번들 변경분만 반영한다.
 *   1) 기본 Theme을 seedKey로 찾는다. 예전 DB의 기본 Theme(isCustom=false, 같은 이름)은 seedKey를 붙여 연결한다.
 *      한 번 존재했다가 사라진 기본 Theme은 사용자가 삭제한 것으로 보고 다시 만들지 않는다.
 *   2) seedId가 없는 예전 시드 문제 중 같은 Theme·유형·본문(payload)이 완전히 같은 것만 번들 문제로 연결한다.
 *   3) DB에 없는 번들 문제를 추가한다(사용자가 삭제한 seedId, 삭제된 Theme의 문제는 제외).
 *   4) 사용자가 수정하지 않은 번들 문제(현재 내용 해시 == seedHash)만 새 번들 내용으로 갱신한다.
 *   id·displayCode·QuestionRecord·Attempt·Session·즐겨찾기·플래그·메모는 건드리지 않는다.
 * - 저장된 버전·번들 해시가 현재와 같으면 아무것도 하지 않는다. 로직 자체도 idempotent하다.
 */
export async function syncDefaultContent(options: { force?: boolean } = {}): Promise<SyncResult> {
  const result: SyncResult = {
    skipped: false,
    createdThemes: 0,
    linked: 0,
    added: 0,
    updated: 0,
    keptUserModified: 0,
  };
  const bundleHash = computeBundleHash();

  await db.transaction(
    "rw",
    [db.categories, db.themes, db.tags, db.questions, db.questionRecords, db.settings],
    async () => {
      const state = await getDefaultContentState();
      if (!options.force && state?.version === DEFAULT_CONTENT_VERSION && state.bundleHash === bundleHash) {
        result.skipped = true;
        return;
      }

      const categories: Category[] = await db.categories.toArray();
      const themes: Theme[] = await db.themes.toArray();
      const isLegacyDb = !state && categories.length > 0;

      // 예전 DB는 모든 기본 Theme을 한 번에 만들었으므로, 지금 없는 기본 Theme은 사용자가 삭제한 것이다.
      const knownThemeKeys = new Set<string>(
        state?.knownThemeKeys ??
          (isLegacyDb ? defaultCategories.flatMap((c) => c.themes.map((t) => themeSeedKey(t.name))) : []),
      );
      const deletedSeedIds = new Set(state?.deletedSeedIds ?? []);

      // ── 1) Category / Theme ──
      const themeByKey = new Map<string, Theme>();
      for (const theme of themes) {
        if (theme.seedKey) themeByKey.set(theme.seedKey, theme);
      }
      for (const theme of themes) {
        if (theme.seedKey || theme.isCustom || !DEFAULT_THEME_PREFIXES[theme.name]) continue;
        const key = themeSeedKey(theme.name);
        if (themeByKey.has(key)) continue;
        theme.seedKey = key;
        themeByKey.set(key, theme);
        await db.themes.update(theme.id, { seedKey: key });
      }

      for (const seedCategory of defaultCategories) {
        for (const seedTheme of seedCategory.themes) {
          const key = themeSeedKey(seedTheme.name);
          if (themeByKey.has(key)) {
            knownThemeKeys.add(key);
            continue;
          }
          if (knownThemeKeys.has(key)) continue; // 사용자가 삭제한 기본 Theme

          let category = categories.find((c) => !c.isCustom && c.name === seedCategory.name);
          if (!category) {
            category = {
              id: crypto.randomUUID(),
              name: seedCategory.name,
              order: categories.length,
              isCustom: false,
            };
            categories.push(category);
            await db.categories.add(category);
          }
          const categoryId = category.id;
          const theme: Theme = {
            id: crypto.randomUUID(),
            categoryId,
            name: seedTheme.name,
            order: themes.filter((t) => t.categoryId === categoryId).length,
            isCustom: false,
            useDifficulty: seedTheme.useDifficulty,
            seedKey: key,
          };
          themes.push(theme);
          themeByKey.set(key, theme);
          knownThemeKeys.add(key);
          await db.themes.add(theme);
          result.createdThemes++;
        }
      }

      // ── 태그 ──
      const tags: Tag[] = await db.tags.toArray();
      const tagNameById = new Map(tags.map((t) => [t.id, t.name]));
      const tagIdByName = new Map(tags.map((t) => [t.name, t.id]));
      async function tagIdsFor(names: string[]): Promise<string[]> {
        const ids: string[] = [];
        for (const name of names) {
          let id = tagIdByName.get(name);
          if (!id) {
            id = crypto.randomUUID();
            await db.tags.add({ id, name });
            tagIdByName.set(name, id);
            tagNameById.set(id, name);
          }
          ids.push(id);
        }
        return ids;
      }

      const questions: Question[] = await db.questions.toArray();
      const currentHash = (q: Question) =>
        seedContentHash({
          type: q.type,
          payload: q.payload,
          explanation: q.explanation,
          difficulty: q.difficulty,
          tagNames: q.tagIds.map((id) => tagNameById.get(id)).filter((n): n is string => !!n),
        });

      // ── 2) 예전 시드 문제 연결 (확실히 같은 것만) ──
      const bySeedId = new Map<string, Question>();
      for (const q of questions) if (q.seedId) bySeedId.set(q.seedId, q);

      const unlinked = questions
        .filter((q) => !q.seedId)
        .sort((a, b) => a.createdAt - b.createdAt);
      const themeKeyById = new Map([...themeByKey].map(([key, t]) => [t.id, key]));
      for (const seed of defaultQuestions) {
        if (bySeedId.has(seed.seedId) || deletedSeedIds.has(seed.seedId)) continue;
        const key = themeSeedKey(seed.themeName);
        const payloadKey = stableStringify(seed.payload);
        const matchIndex = unlinked.findIndex(
          (q) =>
            themeKeyById.get(q.themeId) === key &&
            q.type === seed.type &&
            stableStringify(q.payload) === payloadKey,
        );
        if (matchIndex < 0) continue;
        const [match] = unlinked.splice(matchIndex, 1);
        // 연결 시점의 내용을 기준 해시로 삼는다 → 사용자가 이후 수정하지 않는 한 번들 개선이 반영된다.
        match.seedId = seed.seedId;
        match.seedHash = currentHash(match);
        bySeedId.set(seed.seedId, match);
        await db.questions.update(match.id, { seedId: match.seedId, seedHash: match.seedHash });
        result.linked++;
      }

      // ── 3) 추가 / 4) 갱신 ──
      const codesByTheme = new Map<string, { displayCode: string }[]>();
      for (const q of questions) {
        const list = codesByTheme.get(q.themeId) ?? [];
        list.push({ displayCode: q.displayCode });
        codesByTheme.set(q.themeId, list);
      }

      const now = Date.now();
      const toAdd: Question[] = [];
      for (const [index, seed] of defaultQuestions.entries()) {
        if (deletedSeedIds.has(seed.seedId)) continue;
        const theme = themeByKey.get(themeSeedKey(seed.themeName));
        if (!theme) continue; // 사용자가 삭제한 기본 Theme의 문제는 추가하지 않는다

        const bundleContentHash = seedContentHash(toSeedContent(seed));
        const existing = bySeedId.get(seed.seedId);

        if (!existing) {
          const codes = codesByTheme.get(theme.id) ?? [];
          const displayCode = generateDisplayCode(theme, codes);
          codes.push({ displayCode });
          codesByTheme.set(theme.id, codes);
          toAdd.push({
            id: crypto.randomUUID(),
            displayCode,
            categoryId: theme.categoryId,
            themeId: theme.id,
            type: seed.type,
            difficulty: seed.difficulty,
            tagIds: await tagIdsFor(seed.tagNames),
            explanation: seed.explanation,
            flagged: false,
            favorite: false,
            payload: seed.payload,
            seedId: seed.seedId,
            seedHash: bundleContentHash,
            // 번들 순서가 곧 기본 출제 순서가 되도록 생성 시각을 1ms씩 증가시킨다.
            createdAt: now + index,
            updatedAt: now + index,
          } as Question);
          continue;
        }

        const existingHash = currentHash(existing);
        if (existing.seedHash && existingHash !== existing.seedHash) {
          result.keptUserModified++; // 사용자가 수정한 문제는 보존
          continue;
        }
        if (existingHash === bundleContentHash) {
          if (existing.seedHash !== bundleContentHash) {
            await db.questions.update(existing.id, { seedHash: bundleContentHash });
          }
          continue;
        }
        await db.questions.update(existing.id, {
          type: seed.type,
          payload: seed.payload,
          explanation: seed.explanation,
          difficulty: seed.difficulty,
          tagIds: await tagIdsFor(seed.tagNames),
          seedHash: bundleContentHash,
          updatedAt: now,
        } as Partial<Question>);
        result.updated++;
      }

      if (toAdd.length > 0) {
        const records: QuestionRecord[] = toAdd.map((q) => ({
          questionId: q.id,
          totalAttempts: 0,
          correctCount: 0,
          wrongCount: 0,
          lastResult: null,
          lastAttemptAt: null,
        }));
        await db.questions.bulkAdd(toAdd);
        await db.questionRecords.bulkAdd(records);
        result.added = toAdd.length;
      }

      const nextState: DefaultContentState = {
        version: DEFAULT_CONTENT_VERSION,
        bundleHash,
        knownThemeKeys: [...knownThemeKeys].sort(),
        deletedSeedIds: [...deletedSeedIds].sort(),
      };
      await putDefaultContentState(nextState);
    },
  );

  return result;
}
