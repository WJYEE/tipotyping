// Knowledge Universe의 domain 타입. docs/KNOWLEDGE_CAREER_UNIVERSE_DESIGN.md 5장 기준.
//   Category = Knowledge Region, Theme = Constellation, KnowledgeConcept = Star,
//   Question / Attempt = Learning Evidence.
// KnowledgeConcept는 Tag가 아니다(Tag 시스템은 그대로). 개념의 "상태"(밝기, 단계 등)는 저장하지 않고 증거에서 파생한다.

export type ConceptOrigin = "seed" | "user" | "tag-promoted";

export interface KnowledgeConcept {
  /**
   * 안정적인 내부 id(= 향후 Stellation의 Star identity). 이름·소속·aliases를 바꿔도, Question/Attempt가 늘거나 줄어도 바뀌지 않는다.
   * 별의 deterministic 위치도 이 id의 해시에서 만들어야 한다(이름이 아니라).
   */
  id: string;
  name: string;
  /** 같은 개념의 다른 표기. 사람이 확인하는 매칭 보조 정보일 뿐 자동 병합의 근거가 아니다. */
  aliases: string[];
  /** home Theme(= 소속 Constellation). 하나의 필수 소속. */
  themeId: string;
  /** (themeId, nameKey)가 유일하다는 DB 제약에 쓰는 정규화된 이름. name에서 파생되며 직접 수정하지 않는다. */
  nameKey: string;
  description?: string;
  origin: ConceptOrigin;
  /** 보관된 개념은 목록/하늘에서 빠지지만 id와 연결은 유지된다. */
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

/** primary: 이 문제가 주로 묻는 개념(문제당 최대 1개). secondary: 부수적으로 쓰이는 개념. */
export type QuestionConceptRole = "primary" | "secondary";

/** Question ↔ KnowledgeConcept M:N join. (questionId, conceptId) 쌍은 유일하다. */
export interface QuestionConcept {
  id: string;
  questionId: string;
  conceptId: string;
  role: QuestionConceptRole;
}

/**
 * 한 개념에 대한 원시 학습 증거(raw evidence). Attempt가 원천이며 저장하지 않는다.
 * Historical Mastery / Memory Strength / Stage는 이 값을 입력으로 다음 Phase에서 계산한다.
 */
export interface ConceptEvidence {
  conceptId: string;
  /** 이 개념에 연결된 서로 다른 문제 수 */
  linkedQuestionCount: number;
  /** 그중 한 번이라도 푼 문제 수 */
  studiedQuestionCount: number;
  attemptCount: number;
  correctCount: number;
  /** 시도가 없으면 null */
  accuracy: number | null;
  lastStudiedAt: number | null;
}

/**
 * ConceptEvidence → StarNode 변환의 중간 결과. 위치(position)와 mastered/favorite은 Stellation 쪽(다음 Phase)이 정한다.
 * 필드 이름과 의미는 constellation StarNode와 같아서 `{ ...input, position, mastered, favorite }`으로 StarNode를 만들 수 있다.
 */
export interface ConceptStarInput {
  id: string;
  label: string;
  categoryId: string;
  themeId: string;
  questionCount: number;
  studiedCount: number;
  attemptCount: number;
  correctCount: number;
  accuracy: number | null;
  lastStudiedAt: number | null;
}
