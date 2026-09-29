// 13장/15장: 문제를 importQuestions와 동일한 스키마(JSON)로 내보낸다.
// id/displayCode를 함께 포함해 재-import 시 유실 없이 그대로 복원되게 한다.
import { categoryRepo } from "@/db/repositories/categoryRepo";
import { questionRepo } from "@/db/repositories/questionRepo";
import { tagRepo } from "@/db/repositories/tagRepo";
import { themeRepo } from "@/db/repositories/themeRepo";
import type { ImportRow } from "@/lib/importQuestions";

export async function exportQuestionsAsJson(): Promise<string> {
  const [questions, categories, themes, tags] = await Promise.all([
    questionRepo.list(),
    categoryRepo.list(),
    themeRepo.list(),
    tagRepo.list(),
  ]);
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const themeById = new Map(themes.map((t) => [t.id, t]));
  const tagById = new Map(tags.map((t) => [t.id, t]));

  const rows: ImportRow[] = questions.map((q) => ({
    id: q.id,
    displayCode: q.displayCode,
    categoryName: categoryById.get(q.categoryId)?.name ?? "",
    themeName: themeById.get(q.themeId)?.name ?? "",
    type: q.type,
    difficulty: q.difficulty,
    tags: q.tagIds.map((id) => tagById.get(id)?.name).filter((n): n is string => !!n),
    explanation: q.explanation,
    favorite: q.favorite,
    flagged: q.flagged,
    memo: q.memo,
    payload: q.payload,
  }));

  return JSON.stringify(rows, null, 2);
}
