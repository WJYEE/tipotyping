import { db } from "@/db/db";
import { categoryRepo } from "@/db/repositories/categoryRepo";
import { themeRepo } from "@/db/repositories/themeRepo";
import { tagRepo } from "@/db/repositories/tagRepo";
import { questionRepo } from "@/db/repositories/questionRepo";
import { defaultCategories } from "@/db/seed/defaultCategories";
import { sampleQuestions } from "@/db/seed/sampleQuestions";
import type { Question } from "@/types/domain";

/**
 * 첫 실행 시 기본 Category/Theme + 검증용 샘플 문제를 채운다.
 * 이미 Category가 하나라도 있으면(=이전에 시드했거나 사용자가 데이터를 만든 상태) 아무것도 하지 않는다.
 */
export async function seedIfEmpty(): Promise<void> {
  const existingCount = await db.categories.count();
  if (existingCount > 0) return;

  const themeByName = new Map<string, { id: string; categoryId: string }>();

  for (const [categoryIndex, seedCategory] of defaultCategories.entries()) {
    const category = await categoryRepo.create({
      name: seedCategory.name,
      order: categoryIndex,
      isCustom: false,
    });

    for (const [themeIndex, seedTheme] of seedCategory.themes.entries()) {
      const theme = await themeRepo.create({
        categoryId: category.id,
        name: seedTheme.name,
        order: themeIndex,
        isCustom: false,
        useDifficulty: seedTheme.useDifficulty,
      });
      themeByName.set(theme.name, { id: theme.id, categoryId: category.id });
    }
  }

  for (const seedQuestion of sampleQuestions) {
    const theme = themeByName.get(seedQuestion.themeName);
    if (!theme) {
      throw new Error(`샘플 문제가 참조하는 테마를 찾을 수 없습니다: ${seedQuestion.themeName}`);
    }

    const tags = await Promise.all(seedQuestion.tagNames.map((name) => tagRepo.getOrCreate(name)));

    await questionRepo.create({
      categoryId: theme.categoryId,
      themeId: theme.id,
      type: seedQuestion.type,
      difficulty: seedQuestion.difficulty,
      tagIds: tags.map((t) => t.id),
      explanation: seedQuestion.explanation,
      flagged: false,
      favorite: false,
      payload: seedQuestion.payload,
    } as Omit<Question, "id" | "createdAt" | "updatedAt">);
  }
}
