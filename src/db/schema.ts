import Dexie, { type EntityTable } from "dexie";
import { generateDisplayCode } from "@/lib/displayCode";
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

    // v2: Question에 사용자 노출용 displayCode 추가 (예: SQL-0001). 기존 Question에는
    // Theme별로 생성 순서(createdAt)대로 순번을 매겨 채워준다.
    this.version(2)
      .stores({
        questions:
          "id, categoryId, themeId, type, difficulty, *tagIds, flagged, favorite, createdAt, displayCode",
      })
      .upgrade(async (tx) => {
        const themes = await tx.table("themes").toArray();
        const themeById = new Map(themes.map((t) => [t.id, t]));
        const questions = await tx.table("questions").orderBy("createdAt").toArray();

        const assignedByTheme = new Map<string, { displayCode: string }[]>();

        for (const q of questions) {
          if (q.displayCode) continue;
          const theme = themeById.get(q.themeId);
          const themeKey = theme?.id ?? "unknown";
          const already = assignedByTheme.get(themeKey) ?? [];
          const displayCode = generateDisplayCode(
            theme ?? { id: q.themeId, name: "MISC" },
            already,
          );
          already.push({ displayCode });
          assignedByTheme.set(themeKey, already);

          await tx.table("questions").update(q.id, { displayCode });
        }
      });

    // v3: 기본 제공 Theme의 displayCode 접두어를 사람이 읽을 수 있는 고정 값(SQL, PY, DS...)으로
    // 통일했다. v2에서 한글 Theme에 theme id 기반 접두어가 붙은 문제들을 Theme별 생성 순서 그대로
    // 새 접두어로 재발급한다 (사용자 추가 Theme의 코드는 로직이 바뀌지 않아 결과가 동일하다).
    this.version(3).stores({}).upgrade(async (tx) => {
      const themes = await tx.table("themes").toArray();
      const themeById = new Map(themes.map((t) => [t.id, t]));
      const questions = await tx.table("questions").orderBy("createdAt").toArray();

      const assignedByTheme = new Map<string, { displayCode: string }[]>();

      for (const q of questions) {
        const theme = themeById.get(q.themeId);
        const themeKey = theme?.id ?? "unknown";
        const already = assignedByTheme.get(themeKey) ?? [];
        const displayCode = generateDisplayCode(theme ?? { id: q.themeId, name: "MISC" }, already);
        already.push({ displayCode });
        assignedByTheme.set(themeKey, already);

        await tx.table("questions").update(q.id, { displayCode });
      }
    });
  }
}

export const db = new TipoTypingDB();
