import { db } from "@/db/db";
import { questionRecordRepo } from "@/db/repositories/questionRecordRepo";
import { sessionRepo } from "@/db/repositories/sessionRepo";
import { generateDisplayCode } from "@/lib/displayCode";
import type { Question } from "@/types/domain";

export const questionRepo = {
  list(): Promise<Question[]> {
    return db.questions.toArray();
  },

  get(id: string): Promise<Question | undefined> {
    return db.questions.get(id);
  },

  listByTheme(themeId: string): Promise<Question[]> {
    return db.questions.where("themeId").equals(themeId).toArray();
  },

  listByTag(tagId: string): Promise<Question[]> {
    return db.questions.where("tagIds").equals(tagId).toArray();
  },

  /** displayCode로 문제를 찾는다 (Question Management의 "코드로 찾기"용). */
  findByDisplayCode(displayCode: string): Promise<Question | undefined> {
    return db.questions.where("displayCode").equals(displayCode).first();
  },

  /**
   * Question 생성과 동시에 비어있는 QuestionRecord를 함께 만들어 1:1 관계를 항상 보장한다.
   * options.id: Import 시 원본 문제의 id를 그대로 유지하기 위한 override (13장 "동일 ID → Skip" 판별에 사용).
   * options.displayCode: Import/복원 시 기존 displayCode를 유지하려는 시도. 같은 Theme 내에서
   * 이미 사용 중이면 충돌을 피해 자동으로 새로 생성한다 (동일 Theme 내 중복 금지가 항상 우선).
   */
  async create(
    data: Omit<Question, "id" | "createdAt" | "updatedAt" | "displayCode">,
    options?: { id?: string; displayCode?: string },
  ): Promise<Question> {
    const now = Date.now();
    const theme = await db.themes.get(data.themeId);
    const existingInTheme = await db.questions.where("themeId").equals(data.themeId).toArray();

    let displayCode = options?.displayCode;
    if (displayCode && existingInTheme.some((q) => q.displayCode === displayCode)) {
      displayCode = undefined; // 충돌 시 아래에서 새로 생성
    }
    if (!displayCode) {
      displayCode = theme
        ? generateDisplayCode(theme, existingInTheme)
        : generateDisplayCode({ id: data.themeId, name: "MISC" }, existingInTheme);
    }

    const question = {
      id: options?.id ?? crypto.randomUUID(),
      ...data,
      displayCode,
      createdAt: now,
      updatedAt: now,
    } as Question;

    await db.transaction("rw", db.questions, db.questionRecords, async () => {
      await db.questions.add(question);
      await db.questionRecords.add({
        questionId: question.id,
        totalAttempts: 0,
        correctCount: 0,
        wrongCount: 0,
        lastResult: null,
        lastAttemptAt: null,
      });
    });

    return question;
  },

  /**
   * options.resetRecord: true면 QuestionRecord(누적 학습기록)를 초기화한다.
   * 기본값은 유지(false) — 12장 "문제 수정 시 기존 학습 기록 처리: 유지/초기화, 기본값은 유지".
   * displayCode는 생성 이후 고정 식별자이므로 update로 변경할 수 없다.
   */
  async update(
    id: string,
    patch: Partial<Omit<Question, "id" | "createdAt" | "displayCode">>,
    options?: { resetRecord?: boolean },
  ): Promise<void> {
    await db.questions.update(id, { ...patch, updatedAt: Date.now() });
    if (options?.resetRecord) {
      await questionRecordRepo.reset(id);
    }
  },

  /**
   * 12장: 문제 삭제 시 Question + QuestionRecord + 관련 Attempt를 모두 삭제하고,
   * 영향받은 Session들의 집계값을 재계산한다 (Session 자체는 유지).
   */
  async remove(id: string): Promise<void> {
    let affectedSessionIds: string[] = [];

    await db.transaction("rw", db.questions, db.questionRecords, db.attempts, async () => {
      const attempts = await db.attempts.where("questionId").equals(id).toArray();
      affectedSessionIds = [...new Set(attempts.map((a) => a.sessionId))];

      await db.attempts.where("questionId").equals(id).delete();
      await db.questionRecords.delete(id);
      await db.questions.delete(id);
    });

    for (const sessionId of affectedSessionIds) {
      await sessionRepo.recomputeStats(sessionId);
    }
  },
};
