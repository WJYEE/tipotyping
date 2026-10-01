// Career Dashboard 집계 순수 함수. DB 조회와 분리해 테스트 가능하게 한다
// (evaluateAnswer.ts/questionSelection.ts와 같은 패턴).
import type { CompetencyCategory } from "@/types/career";

export type JobPostingStatus = "not-started" | "in-progress" | "complete";

/**
 * AI 자동 분석이 없으므로 "분석 완료/중/대기" 대신 실제 입력 상태로 상태를 판단한다.
 * - Requirement가 0개면 아직 시작 전.
 * - 하나라도 Competency/Role 둘 다 태깅되지 않았으면 정리 중.
 * - 전부 태깅됐으면 완료.
 */
export function deriveJobPostingStatus(requirementCount: number, fullyTaggedCount: number): JobPostingStatus {
  if (requirementCount === 0) return "not-started";
  return fullyTaggedCount === requirementCount ? "complete" : "in-progress";
}

export interface CompetencyDemandLink {
  competencyId: string;
  jobPostingId: string;
}

/** competencyId → 그 Competency를 요구하는 서로 다른 JobPosting 개수 (중복 JD는 1개로 센다). */
export function countCompetencyDemand(links: CompetencyDemandLink[]): Map<string, number> {
  const byCompetency = new Map<string, Set<string>>();
  for (const link of links) {
    const set = byCompetency.get(link.competencyId) ?? new Set<string>();
    set.add(link.jobPostingId);
    byCompetency.set(link.competencyId, set);
  }
  return new Map([...byCompetency.entries()].map(([id, jdSet]) => [id, jdSet.size]));
}

export interface CompetencyBubbleLike {
  competency: { category: CompetencyCategory };
  demandCount: number;
}

/**
 * Bubble Map 가독성을 위해 category로 거르고 상위 N개만 남긴다. 입력이 이미 demandCount
 * 내림차순(동률은 기존 순서 유지하는 stable sort)이라고 가정하고 그 순서를 그대로 보존한다 —
 * 여기서 다시 정렬하지 않는다.
 */
export function filterAndLimitCompetencyBubbles<T extends CompetencyBubbleLike>(
  bubbles: T[],
  category: CompetencyCategory | "all",
  limit: number,
): T[] {
  const filtered = category === "all" ? bubbles : bubbles.filter((b) => b.competency.category === category);
  return filtered.slice(0, limit);
}

/**
 * demandCount → 버블 지름(px). ratio(0~1)에 지수를 줘서 빈도가 낮은 Competency는 min 쪽으로
 * 더 바짝 붙고 1위에 가까운 것만 max에 가깝게 커지도록 — 선형보다 크기 차이를 더 뚜렷하게 만든다.
 */
export function competencyBubbleSize(demandCount: number, maxDemand: number, minSize: number, maxSize: number): number {
  const ratio = maxDemand <= 0 ? 0 : demandCount / maxDemand;
  return Math.round(minSize + (maxSize - minSize) * ratio ** 1.5);
}

/** Competency가 등장한 JD 비율(%). 저장된 JD가 없으면(totalJd=0) 0으로 둔다(0으로 나누지 않는다). */
export function competencyDemandPercent(demandCount: number, totalJd: number): number {
  return totalJd > 0 ? Math.round((demandCount / totalJd) * 100) : 0;
}

export interface RoleMixCount {
  roleId: string;
  count: number;
  percent: number;
}

/**
 * roleId별로 태깅된 Requirement 개수와, 태깅된 전체 Requirement 대비 비율(%)을 구한다.
 * Role 분류는 JobPosting이 아니라 Requirement 단위다("실제 요구사항의 성격을 분류").
 */
export function countRoleMix(roleIdsByRequirement: string[]): RoleMixCount[] {
  const counts = new Map<string, number>();
  for (const roleId of roleIdsByRequirement) {
    counts.set(roleId, (counts.get(roleId) ?? 0) + 1);
  }
  const total = roleIdsByRequirement.length;
  return [...counts.entries()]
    .map(([roleId, count]) => ({
      roleId,
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}
