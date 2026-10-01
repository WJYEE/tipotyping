import Dexie, { type EntityTable, type Transaction } from "dexie";
import { splitIfAlternativeAnswers } from "@/lib/answerAlternatives";
import { generateDisplayCode, planCustomThemeRecode } from "@/lib/displayCode";
import type {
  Company,
  Competency,
  JobPosting,
  Requirement,
  RequirementCompetency,
  RequirementRole,
  Role,
} from "@/types/career";
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
  companies!: EntityTable<Company, "id">;
  jobPostings!: EntityTable<JobPosting, "id">;
  requirements!: EntityTable<Requirement, "id">;
  competencies!: EntityTable<Competency, "id">;
  roles!: EntityTable<Role, "id">;
  requirementCompetencies!: EntityTable<RequirementCompetency, "id">;
  requirementRoles!: EntityTable<RequirementRole, "id">;

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

    // v4: 사용자 추가 Theme의 fallback 접두어에서 내부 theme id를 제거하고(순한글 → CUSTOM),
    // 기본 Theme 접두어나 다른 사용자 Theme과 겹치지 않게 정리한다. 번호는 유지하고 접두어만 바꾼다.
    this.version(4).stores({}).upgrade(upgradeCustomThemeDisplayCodes);

    // v5: 번들 기본 문제은행 동기화용 seedId 인덱스. 기존 데이터는 변경하지 않으며,
    // 기존 문제·Theme과 번들의 연결은 앱 시작 시 syncDefaultContent가 처리한다.
    this.version(5).stores({
      questions:
        "id, categoryId, themeId, type, difficulty, *tagIds, flagged, favorite, createdAt, displayCode, seedId",
    });

    // v6: answer-input 중 "미루다, 연기하다"처럼 쉼표로 복수 정답을 한 문자열에 넣어뒀던 기존 데이터를
    // 실제 배열(alternatives)로 마이그레이션한다. 쉼표가 있다는 이유만으로 무조건 나누지 않고,
    // 모든 조각이 독립된 정답처럼 보일 때만 분리한다(숫자/Big-O 표기 등은 보존).
    this.version(6).stores({}).upgrade(upgradeAnswerInputAlternatives);

    // v7: Session 생성 경쟁 상태(effect 이중 실행)와 "10초 이상이면 무조건 기록" 정책 때문에
    // Attempt가 0개인 빈 Session이 남아있던 버그를 고쳤다. 이미 저장된 빈 Session(및 혹시 남아있을
    // 관련 Attempt)을 정리한다. totalAttempts가 0인 Session은 분석적으로 의미가 없어 삭제해도 안전하다.
    this.version(7).stores({}).upgrade(pruneEmptySessions);

    // v8: Career 서비스 영역의 데이터 모델 추가 (JobPosting/Requirement/Competency/Role 및
    // 연결 관계). 전부 새 테이블이라 데이터 마이그레이션은 필요 없다. Learning 테이블은 건드리지 않는다.
    this.version(8).stores({
      companies: "id, name",
      jobPostings: "id, companyId, createdAt, updatedAt",
      requirements: "id, jobPostingId, sourceSection, createdAt",
      competencies: "id, &name, category",
      roles: "id, &name",
      requirementCompetencies: "id, requirementId, competencyId",
      requirementRoles: "id, requirementId, roleId",
    });

    // v9: JobPosting에 채용 시작일/마감일·고용형태·신입/경력 조건·근무지역을 추가한다. 전부 선택
    // 필드라 기존 JobPosting 문서는 그 값들이 없는 채로("undefined") 그대로 유효하다 — 데이터 변환이
    // 필요 없고 기존 JD는 전혀 건드리지 않는다. applicationEndDate만 "마감 임박순" 정렬/필터를
    // 염두에 두고 인덱스를 추가한다(나머지 새 필드는 지금 그런 조회가 없어 인덱스를 걸지 않는다).
    this.version(9).stores({
      jobPostings: "id, companyId, createdAt, updatedAt, applicationEndDate",
    });

    // v10: Requirement/Competency 표준화 구조. Requirement.text를 rawText로 이름만 바꾼다(값은
    // 그대로 복사 — 원문을 고치지 않는다는 원칙 그대로). Competency에는 선택적 learningThemeKey
    // (향후 Theme 연결용)를 추가한다 — 기존 값이 없어도 유효한 선택 필드라 별도 변환이 필요 없다.
    // (처음엔 normalizedLabel도 함께 뒀지만, 외부 AI가 이미 정제된 Competency 키워드를 주는
    // 구조로 단순화하면서 이 필드는 빼기로 했다 — 과거에 저장된 값이 있어도 무해하게 남을 뿐이다.)
    this.version(10).stores({}).upgrade(renameRequirementTextToRawText);
  }
}

export async function renameRequirementTextToRawText(tx: Transaction): Promise<void> {
  const requirements = (await tx.table("requirements").toArray()) as Record<string, unknown>[];
  for (const r of requirements) {
    if (typeof r.rawText === "string") continue; // 이미 새 필드가 있으면 손대지 않는다(이중 실행 방지)
    await tx.table("requirements").update(r.id as string, { rawText: (r.text as string | undefined) ?? "" });
  }
}

export async function upgradeAnswerInputAlternatives(tx: Transaction): Promise<void> {
  const questions = (await tx.table("questions").toArray()) as Question[];
  for (const q of questions) {
    if (q.type !== "answer-input" || typeof q.payload.answer !== "string") continue;
    const next = splitIfAlternativeAnswers(q.payload.answer);
    if (next !== q.payload.answer) {
      await tx.table("questions").update(q.id, { payload: { ...q.payload, answer: next } });
    }
  }
}

export async function pruneEmptySessions(tx: Transaction): Promise<void> {
  const sessions = (await tx.table("sessions").toArray()) as Session[];
  for (const session of sessions) {
    if (session.totalAttempts !== 0) continue;
    await tx.table("attempts").where("sessionId").equals(session.id).delete();
    await tx.table("sessions").delete(session.id);
  }
}

export async function upgradeCustomThemeDisplayCodes(tx: Transaction): Promise<void> {
  // 기본 Theme 먼저, 그 다음 사용자 Theme을 order 순으로 처리해 접두어 배정 결과를 결정적으로 만든다.
  const themes = ((await tx.table("themes").toArray()) as Theme[]).sort(
    (a, b) => Number(a.isCustom) - Number(b.isCustom) || a.order - b.order || a.id.localeCompare(b.id),
  );
  const questions = (await tx.table("questions").toArray()) as Question[];
  for (const { id, displayCode } of planCustomThemeRecode(themes, questions)) {
    await tx.table("questions").update(id, { displayCode });
  }
}

export const db = new TipoTypingDB();
