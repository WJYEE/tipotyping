// KB-Bridge ZIP 콘텐츠(중립 JSON)를 검증하고 Tipo 도메인 형태로 변환한다. DB에 의존하지 않는 순수 함수 모음.
// 오류가 있는 항목은 가져오지 않고 issues로 보고한다(전체를 막지 않는다). 모든 항목은 needs_human_review로 시작한다.
import { KB_BRIDGE_ID_PREFIX } from "@/lib/packages/definitions";
import { isHttpUrl } from "@/lib/packages/url";
import type { Difficulty, MultipleChoicePayload } from "@/types/domain";
import type { ConceptNote, DerivedQuestion, Memo, PracticeTask, ResourceLink, ReviewStatus } from "@/types/package";

export interface RawCategory {
  id: string;
  name: string;
  package: string;
  sortOrder: number;
}

export interface RawQuestion {
  id: string;
  categoryId: string;
  topic?: string;
  type: string;
  difficulty?: string;
  question: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation?: string;
  reviewStatus?: string;
  tags?: string[];
}

export interface RawDerived {
  id: string;
  parentQuestionId: string;
  categoryId: string;
  topic?: string;
  question: string;
  learningObjective?: string;
  answerGuide?: string;
  reviewStatus?: string;
}

export interface RawGuide {
  categoryId: string;
  categoryName: string;
  summary?: string;
}

export interface RawTask {
  id: string;
  category: string;
  title: string;
  task: string;
  tools?: string;
  evaluation?: string[];
}

export interface RawNote {
  id: string;
  category: string;
  title: string;
  body: string;
  source?: string;
  verified?: boolean;
}

export interface RawSite {
  category: string;
  title: string;
  url: string;
  whenToUse?: string;
  verification?: string;
}

export interface RawKbBridgeBundle {
  categories: RawCategory[];
  questions: RawQuestion[];
  derived: RawDerived[];
  guides: RawGuide[];
  /** categoryId → 마크다운 본문 */
  guideBodies: Record<string, string>;
  tasks: RawTask[];
  notes: RawNote[];
  sites: RawSite[];
  /** 공유 대화 사례 마크다운(선택) */
  casesMarkdown?: string;
}

export interface BundleQuestion {
  id: string;
  rawId: string;
  categoryKey: string;
  displayCode: string;
  difficulty: Difficulty;
  topic: string;
  tags: string[];
  explanation: string;
  reviewStatus: ReviewStatus;
  payload: MultipleChoicePayload;
}

export interface BundleIssue {
  kind: "question" | "derived" | "task" | "note" | "site" | "guide" | "bundle";
  id: string;
  message: string;
}

export interface KbBridgeBundle {
  categories: RawCategory[];
  questions: BundleQuestion[];
  derived: DerivedQuestion[];
  concepts: ConceptNote[];
  tasks: Omit<PracticeTask, "completedAt">[];
  memos: Omit<Memo, "createdAt" | "updatedAt">[];
  resources: ResourceLink[];
  issues: BundleIssue[];
}

/** 실습 과제·추천 사이트·메모의 자유 라벨을 KB-Bridge 카테고리 id로 이어 주는 표. 없는 라벨은 카테고리 없이 둔다. */
export const CATEGORY_LABEL_TO_KEY: Record<string, string> = {
  Python: "python",
  SQL: "sql",
  "AI Agent": "agent",
  "AI 기반 데이터 분석": "ai_analysis",
  머신러닝: "ml",
  대시보드: "dashboard",
  "OA 및 AI 활용 역량": "oa_ai",
  "자격증 SQLD": "cert_sqld",
  언어: "language",
};

const DIFFICULTY_MAP: Record<string, Difficulty> = {
  intro: "beginner",
  beginner: "beginner",
  basic: "beginner",
  intermediate: "intermediate",
  advanced: "advanced",
};

/** 외부 콘텐츠의 reviewStatus가 무엇이든 자동으로 "검수 완료"로 승격하지 않는다. */
function toReviewStatus(): ReviewStatus {
  return "needs_human_review";
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dup.add(id);
    seen.add(id);
  }
  return [...dup];
}

export function buildKbBridgeBundle(raw: RawKbBridgeBundle): KbBridgeBundle {
  const issues: BundleIssue[] = [];
  const categoryKeys = new Set(raw.categories.map((c) => c.id));
  const categoryName = new Map(raw.categories.map((c) => [c.id, c.name]));

  for (const [kind, ids] of [
    ["category", raw.categories.map((c) => c.id)],
    ["question", raw.questions.map((q) => q.id)],
    ["derived", raw.derived.map((d) => d.id)],
    ["task", raw.tasks.map((t) => t.id)],
    ["note", raw.notes.map((n) => n.id)],
  ] as const) {
    for (const id of duplicates(ids)) {
      issues.push({ kind: "bundle", id, message: `중복 ${kind} id` });
    }
  }

  // ── 문제 ──
  const questions: BundleQuestion[] = [];
  const seenQuestions = new Set<string>();
  for (const q of raw.questions) {
    const problem = validateQuestion(q, categoryKeys);
    if (problem || seenQuestions.has(q.id)) {
      if (problem) issues.push({ kind: "question", id: q.id, message: problem });
      continue; // 중복 id는 첫 항목만 사용 (중복 자체는 위에서 보고)
    }
    seenQuestions.add(q.id);
    const correctIndex = q.options.findIndex((o) => o.id === q.correctOptionId);
    const tags = [...new Set([...(q.tags ?? []), ...(q.topic ? [q.topic] : [])].map((t) => t.trim()).filter(Boolean))];
    questions.push({
      id: `${KB_BRIDGE_ID_PREFIX}${q.id}`,
      rawId: q.id,
      categoryKey: q.categoryId,
      displayCode: q.id.replace(/^TIPO-/, "KBB-"),
      difficulty: DIFFICULTY_MAP[q.difficulty ?? ""] ?? "intermediate",
      topic: q.topic ?? "",
      tags,
      explanation: q.explanation ?? "",
      reviewStatus: toReviewStatus(),
      payload: { prompt: q.question, options: q.options.map((o) => o.text), correctIndex },
    });
  }

  // ── 파생질문: 반드시 (가져온) 원본 문제와 연결 ──
  const derived: DerivedQuestion[] = [];
  const seenDerived = new Set<string>();
  for (const d of raw.derived) {
    if (!d.question?.trim()) {
      issues.push({ kind: "derived", id: d.id, message: "질문 본문이 없음" });
      continue;
    }
    const parent = questions.find((q) => q.rawId === d.parentQuestionId);
    if (!parent) {
      issues.push({ kind: "derived", id: d.id, message: `원본 문제(${d.parentQuestionId})를 찾을 수 없음` });
      continue;
    }
    if (parent.categoryKey !== d.categoryId) {
      issues.push({ kind: "derived", id: d.id, message: "원본 문제와 카테고리가 다름" });
      continue;
    }
    if (seenDerived.has(d.id)) continue;
    seenDerived.add(d.id);
    derived.push({
      id: `${KB_BRIDGE_ID_PREFIX}${d.id}`,
      parentQuestionId: parent.id,
      categoryKey: d.categoryId,
      topic: d.topic ?? "",
      prompt: d.question,
      learningObjective: d.learningObjective,
      answerGuide: d.answerGuide,
      reviewStatus: toReviewStatus(),
    });
  }

  // ── 개념 정리 ──
  const concepts: ConceptNote[] = [];
  for (const g of raw.guides) {
    const body = raw.guideBodies[g.categoryId];
    if (!categoryKeys.has(g.categoryId) || !body?.trim()) {
      issues.push({ kind: "guide", id: g.categoryId, message: "카테고리가 없거나 본문이 비어 있음" });
      continue;
    }
    concepts.push({
      id: `${KB_BRIDGE_ID_PREFIX}concept-${g.categoryId}`,
      categoryKey: g.categoryId,
      title: `${categoryName.get(g.categoryId) ?? g.categoryName} — 학습 정리`,
      summary: g.summary,
      body,
      reviewStatus: toReviewStatus(),
    });
  }

  // ── 실습 과제 ──
  const tasks: KbBridgeBundle["tasks"] = [];
  const seenTasks = new Set<string>();
  for (const t of raw.tasks) {
    const key = CATEGORY_LABEL_TO_KEY[t.category];
    if (!key || !categoryKeys.has(key)) {
      issues.push({ kind: "task", id: t.id, message: `알 수 없는 카테고리: ${t.category}` });
      continue;
    }
    if (!t.title?.trim() || !t.task?.trim()) {
      issues.push({ kind: "task", id: t.id, message: "제목 또는 과제 설명이 없음" });
      continue;
    }
    if (seenTasks.has(t.id)) continue;
    seenTasks.add(t.id);
    tasks.push({
      id: `${KB_BRIDGE_ID_PREFIX}${t.id}`,
      categoryKey: key,
      title: t.title,
      task: t.task,
      tools: t.tools ?? "",
      evaluation: t.evaluation ?? [],
    });
  }

  // ── 메모 ──
  const memos: KbBridgeBundle["memos"] = [];
  const seenNotes = new Set<string>();
  for (const n of raw.notes) {
    if (!n.title?.trim() || !n.body?.trim() || !n.category?.trim()) {
      issues.push({ kind: "note", id: n.id, message: "카테고리·제목·내용 중 비어 있는 항목이 있음" });
      continue;
    }
    if (seenNotes.has(n.id)) continue;
    seenNotes.add(n.id);
    memos.push({
      id: `${KB_BRIDGE_ID_PREFIX}${n.id}`,
      category: n.category,
      title: n.title,
      body: n.body,
      tags: [],
      source: n.source ?? "",
      verified: n.verified === true,
      links: [],
      origin: "bundled",
    });
  }
  if (raw.casesMarkdown?.trim()) {
    memos.push({
      id: `${KB_BRIDGE_ID_PREFIX}NOTE-CASES`,
      category: "금융 IT 사례",
      title: "금융 IT·ERD·자동화·취업 사례 정리",
      body: raw.casesMarkdown,
      tags: ["사례"],
      source: "공유 대화 정리 (사실 확인 전, 가상 예시 포함)",
      verified: false,
      links: [],
      origin: "bundled",
    });
  }

  // ── 추천 사이트 ──
  const resources: ResourceLink[] = [];
  const seenUrls = new Set<string>();
  raw.sites.forEach((s, i) => {
    const id = `${KB_BRIDGE_ID_PREFIX}site-${String(i + 1).padStart(3, "0")}`;
    if (!s.title?.trim() || !s.category?.trim()) {
      issues.push({ kind: "site", id, message: "카테고리 또는 이름이 없음" });
      return;
    }
    if (!isHttpUrl(s.url ?? "")) {
      issues.push({ kind: "site", id, message: `올바른 http(s) URL이 아님: ${s.url}` });
      return;
    }
    const urlKey = s.url.trim();
    if (seenUrls.has(urlKey)) {
      issues.push({ kind: "site", id, message: `중복 URL: ${s.url}` });
      return;
    }
    seenUrls.add(urlKey);
    resources.push({
      id,
      category: s.category,
      title: s.title,
      url: urlKey,
      whenToUse: s.whenToUse ?? "",
      verification: s.verification ?? "",
      origin: "bundled",
    });
  });

  return { categories: raw.categories, questions, derived, concepts, tasks, memos, resources, issues };
}

/** 문제 하나의 오류 메시지. 문제가 없으면 null. */
export function validateQuestion(q: RawQuestion, categoryKeys: Set<string>): string | null {
  if (q.type !== "multiple_choice") return `지원하지 않는 문제 유형: ${q.type}`;
  if (!categoryKeys.has(q.categoryId)) return `알 수 없는 카테고리: ${q.categoryId}`;
  if (!q.question?.trim()) return "문제 본문이 없음";
  if (!Array.isArray(q.options) || q.options.length < 2) return "선택지가 2개 미만";
  const texts = q.options.map((o) => o.text?.trim());
  if (texts.some((t) => !t)) return "빈 선택지가 있음";
  if (new Set(texts).size !== texts.length) return "중복된 선택지가 있음";
  if (new Set(q.options.map((o) => o.id)).size !== q.options.length) return "선택지 id가 중복됨";
  const matches = q.options.filter((o) => o.id === q.correctOptionId).length;
  if (matches !== 1) return "정답 id가 선택지와 일치하지 않음";
  return null;
}
