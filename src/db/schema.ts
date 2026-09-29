import Dexie, { type EntityTable } from "dexie";
import type {
  Attempt,
  Category,
  Question,
  QuestionRecord,
  Session,
  SettingsRecord,
  Tag,
  Theme,
} from "@/types/domain";

export class TipoTypingDB extends Dexie {
  categories!: EntityTable<Category, "id">;
  themes!: EntityTable<Theme, "id">;
  tags!: EntityTable<Tag, "id">;
  questions!: EntityTable<Question, "id">;
  questionRecords!: EntityTable<QuestionRecord, "questionId">;
  sessions!: EntityTable<Session, "id">;
  attempts!: EntityTable<Attempt, "id">;
  settings!: EntityTable<SettingsRecord, "id">;

  constructor() {
    super("tipotyping");

    // v1: Category → Theme → Question 관계, Tag 참조(tagIds[]), 학습기록(QuestionRecord)과
    // Session/Attempt 분리를 승인된 설계 그대로 반영.
    this.version(1).stores({
      categories: "id, order",
      themes: "id, categoryId, order",
      tags: "id, &name",
      questions: "id, categoryId, themeId, type, difficulty, *tagIds, flagged, favorite, createdAt",
      questionRecords: "questionId, lastResult, lastAttemptAt",
      sessions: "id, startedAt",
      attempts: "id, sessionId, questionId, attemptedAt",
      settings: "id",
    });
  }
}

export const db = new TipoTypingDB();
