// 번들 기본 문제은행 동기화 상태(settings 테이블) 와 내용 해시 유틸.
import { db } from "@/db/db";
import type { Difficulty, Question, QuestionType } from "@/types/domain";

export const DEFAULT_CONTENT_STATE_KEY = "defaultContent";

export interface DefaultContentState {
  /** 마지막으로 동기화한 번들 버전(DEFAULT_CONTENT_VERSION) */
  version: number;
  /** 마지막으로 동기화한 번들 전체 내용 해시. 버전을 올리지 않고 내용만 바뀐 경우도 감지한다. */
  bundleHash: string;
  /** 한 번이라도 DB에 존재했던 기본 Theme seedKey. 여기 있는데 DB에 없으면 사용자가 삭제한 것이다. */
  knownThemeKeys: string[];
  /** 사용자가 삭제한 번들 문제 seedId. 다시 추가하지 않는다. */
  deletedSeedIds: string[];
}

export async function getDefaultContentState(): Promise<DefaultContentState | undefined> {
  const row = await db.settings.get(DEFAULT_CONTENT_STATE_KEY);
  return row?.value as DefaultContentState | undefined;
}

export async function putDefaultContentState(state: DefaultContentState): Promise<void> {
  await db.settings.put({ id: DEFAULT_CONTENT_STATE_KEY, value: state });
}

/** 사용자가 번들 문제를 삭제했음을 기록한다 (이후 동기화에서 다시 생성하지 않음). settings 테이블 트랜잭션 안에서 호출한다. */
export async function markSeedQuestionDeleted(seedId: string): Promise<void> {
  const state = await getDefaultContentState();
  if (!state) return; // 동기화 전(=번들 문제가 아직 없는) 상태에서는 기록할 대상이 없다.
  if (state.deletedSeedIds.includes(seedId)) return;
  await putDefaultContentState({ ...state, deletedSeedIds: [...state.deletedSeedIds, seedId] });
}

export interface SeedContent {
  type: QuestionType;
  payload: Question["payload"];
  explanation?: string;
  difficulty?: Difficulty;
  tagNames: string[];
}

/** 객체 키 순서와 무관한 JSON 문자열. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** FNV-1a 32bit 해시 (충돌 가능성보다 결정성·속도가 중요한 변경 감지용). */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** 문제 "내용"(유형·본문·해설·난이도·태그 이름)의 해시. id·displayCode·학습 상태는 포함하지 않는다. */
export function seedContentHash(content: SeedContent): string {
  return fnv1a(
    stableStringify({
      type: content.type,
      payload: content.payload,
      explanation: content.explanation || undefined,
      difficulty: content.difficulty || undefined,
      tagNames: [...new Set(content.tagNames)].sort(),
    }),
  );
}
