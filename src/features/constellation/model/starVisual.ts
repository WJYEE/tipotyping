// 학습 지표 → 별의 시각 속성. 화려함이 아니라 "밝기·안정성·색온도"의 미세한 차이로만 표현한다.
// 단위: 반지름은 CSS px, 밝기는 0~1, 색온도는 0(따뜻함)~1(차가움).
import { hashString } from "@/features/constellation/model/rng";
import type { StarNode } from "@/features/constellation/model/types";

export interface StarVisual {
  coreRadius: number;
  haloRadius: number;
  brightness: number;
  temperature: number;
  twinkleAmp: number;
  /** rad/s. 느리게(주기 수 초 이상) */
  twinkleSpeed: number;
  phase: number;
  /** 0이면 스파이크 없음. 소수의 선명한 별에만 0~1 값을 준다 */
  spike: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 학습량 → 0~1. 로그 스케일이라 많이 풀어도 급격히 밝아지지 않는다. */
export function studyAmount(attemptCount: number): number {
  return clamp(Math.log10(1 + attemptCount) / Math.log10(1 + 80), 0, 1);
}

export function starVisual(star: StarNode): StarVisual {
  const h = hashString(star.id);
  const phase = ((h % 6283) / 1000) % (Math.PI * 2);
  const speedJitter = ((h >>> 8) % 100) / 100;

  // 아직 학습하지 않은 개념: 사라지지 않고 아주 희미하게 남아 있다.
  if (star.attemptCount === 0) {
    return {
      coreRadius: 0.8,
      haloRadius: 4.5,
      brightness: 0.16,
      temperature: 0.55,
      twinkleAmp: 0.02,
      twinkleSpeed: lerp(0.5, 1.1, speedJitter),
      phase,
      spike: 0,
    };
  }

  const amount = studyAmount(star.attemptCount);
  const accuracy = star.accuracy ?? 0;
  // 개념 안에서 푼 문제 비율이 높을수록 조금 더 또렷하다.
  const coverage = star.questionCount > 0 ? star.studiedCount / star.questionCount : 0;
  const strength = clamp(0.5 * amount + 0.3 * accuracy + 0.2 * coverage, 0, 1);

  const brightness = lerp(0.42, 0.95, strength);
  const coreRadius = lerp(1.15, 2.1, strength);
  // 정확도가 높을수록 halo는 좁고 선명, 낮을수록 넓고 부드럽다.
  const haloRadius = lerp(8, 17, strength) * lerp(1.12, 0.9, accuracy);

  return {
    coreRadius,
    haloRadius,
    brightness,
    // 낮은 정확도는 아주 약간 따뜻하게, 높은 정확도는 약간 차갑게
    temperature: lerp(0.16, 0.82, accuracy),
    // 불안정한 별일수록 반짝임이 조금 더 크다 (그래도 최대 몇 %)
    twinkleAmp: lerp(0.07, 0.022, accuracy),
    twinkleSpeed: lerp(0.45, 1.0, speedJitter),
    phase,
    // 숙달 + 높은 밝기인 소수의 별에만 회절 스파이크
    spike: star.mastered && strength > 0.78 ? clamp((strength - 0.7) / 0.3, 0.35, 1) : 0,
  };
}
