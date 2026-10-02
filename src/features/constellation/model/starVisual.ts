// 학습 지표 → Knowledge Star의 시각 속성.
// 원칙: 학습량이 높다고 별이 "커지지" 않는다. 매우 작은 core는 유지하고, 광도(luminosity)와 광학적 범위(PSF), 회절 ray가 강해진다.
//   학습량(log)   → luminosity, PSF 범위(optical extent)
//   숙련/커버리지 → core 선명도(작고 안정적), 반짝임 감소, 회절 ray tier
//   정확도        → halo 세기(높을수록 깨끗함), 색온도(미세)
// 단위: 길이는 CSS px, 광도는 0~1, 색온도는 0(따뜻함)~1(차가움, 0.5가 중립).
import { hashString } from "@/features/constellation/model/rng";
import type { StarNode } from "@/features/constellation/model/types";

/** 1: 희미한 별(ray 없음) 2: 일반(아주 짧은 ray) 3: 밝은 별(가는 4방향 ray) 4: Anchor(길고 가는 ray + 약한 대각선 ray) */
export type StarTier = 1 | 2 | 3 | 4;

export interface StarVisual {
  tier: StarTier;
  /** 중심 광도 0~1 */
  luminosity: number;
  /** 아주 작은 core의 가우시안 시그마 */
  coreSigma: number;
  /** Moffat PSF의 스케일 반경과 세기 */
  psfRadius: number;
  psfGain: number;
  /** 회절 ray: 가로/세로 길이가 다를 수 있다. 0이면 없음 */
  rayLengthH: number;
  rayLengthV: number;
  rayGain: number;
  /** ray 전체 회전(rad). 별마다 조금씩 다르다 */
  rayAngle: number;
  /** 대각선 보조 ray의 상대 세기(Anchor만) */
  diagGain: number;
  temperature: number;
  twinkleAmp: number;
  /** rad/s. 느리게(주기 수 초 이상) */
  twinkleSpeed: number;
  phase: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 학습량 → 0~1. 로그 스케일이라 많이 풀어도 급격히 밝아지지 않는다. */
export function studyAmount(attemptCount: number): number {
  return clamp(Math.log10(1 + attemptCount) / Math.log10(1 + 80), 0, 1);
}

/** 별 하나의 "강도"(0~1): 학습량 + 정확도 + 개념 커버리지. */
export function starStrength(star: StarNode): number {
  if (star.attemptCount === 0) return 0;
  const accuracy = star.accuracy ?? 0;
  const coverage = star.questionCount > 0 ? star.studiedCount / star.questionCount : 0;
  return clamp(0.5 * studyAmount(star.attemptCount) + 0.3 * accuracy + 0.2 * coverage, 0, 1);
}

// 임계값: 대부분의 별은 작고 조용하게(tier 1~2), 밝은 별과 Anchor는 소수만.
const TIER2_MIN = 0.7;
const TIER3_MIN = 0.827;
const TIER4_MIN = 0.91;

export function starTier(star: StarNode): StarTier {
  const s = starStrength(star);
  if (star.attemptCount === 0 || s < TIER2_MIN) return 1;
  if (star.mastered && s >= TIER4_MIN) return 4;
  return s >= TIER3_MIN ? 3 : 2;
}

/** 해시에서 0~1 값을 만든다(비트 구간별로 독립). */
const unit = (h: number, shift: number) => ((h >>> shift) % 1000) / 1000;

export function starVisual(star: StarNode): StarVisual {
  const h = hashString(star.id);
  const phase = unit(h, 0) * Math.PI * 2;
  const speedJitter = unit(h, 8);
  const tilt = unit(h, 14) * 2 - 1; // -1~1
  const asym = unit(h, 20);
  const tint = unit(h, 4) * 2 - 1;
  const tier = starTier(star);

  // 아직 학습하지 않은 개념: 사라지지 않고 아주 희미한 작은 점으로 남는다.
  if (star.attemptCount === 0) {
    return {
      tier: 1,
      luminosity: 0.3,
      coreSigma: 0.62,
      psfRadius: 1.1,
      psfGain: 0.1,
      rayLengthH: 0,
      rayLengthV: 0,
      rayGain: 0,
      rayAngle: 0,
      diagGain: 0,
      temperature: 0.5 + tint * 0.05,
      twinkleAmp: 0.02,
      twinkleSpeed: lerp(0.5, 1.1, speedJitter),
      phase,
    };
  }

  const amount = studyAmount(star.attemptCount);
  const accuracy = star.accuracy ?? 0;
  const coverage = star.questionCount > 0 ? star.studiedCount / star.questionCount : 0;
  const strength = starStrength(star);
  // 숙련도: 정확하고 넓게 푼 개념일수록 core가 작고 안정적이다.
  const clarity = clamp(0.6 * accuracy + 0.4 * coverage + (star.mastered ? 0.12 : 0), 0, 1);

  const luminosity = clamp(0.3 + 0.7 * Math.pow(strength, 2.2), 0, 1);
  const coreSigma = lerp(0.8, 0.5, clarity);
  const psfRadius = lerp(1.1, 3.3, Math.pow(amount, 0.8)) * lerp(1.12, 0.92, accuracy);
  const psfGain = lerp(0.26, 0.12, accuracy) * lerp(0.8, 1, strength);

  // tier별 회절 ray. 길이는 core보다 훨씬 길지만 세기는 낮다. 별마다 방향·가로세로 비율이 조금씩 다르다.
  let rayLength = 0;
  let rayGain = 0;
  let angleSpread = 0;
  let diagGain = 0;
  if (tier === 2) {
    rayLength = lerp(6, 10, (strength - TIER2_MIN) / (TIER3_MIN - TIER2_MIN));
    rayGain = 0.12;
    angleSpread = 0.1;
  } else if (tier === 3) {
    rayLength = lerp(18, 30, (strength - TIER3_MIN) / (1 - TIER3_MIN));
    rayGain = 0.24;
    angleSpread = 0.12;
  } else if (tier === 4) {
    rayLength = lerp(62, 88, (strength - TIER4_MIN) / (1 - TIER4_MIN));
    rayGain = 0.32;
    angleSpread = 0.09;
    diagGain = 0.3;
  }
  const verticalRatio = lerp(0.7, 1, asym);

  // 색온도: 대부분 중립~살짝 차갑게. 낮은 정확도는 살짝 따뜻하게, 극소수의 Anchor만 blue-white 쪽.
  const temperature = clamp(lerp(0.32, 0.64, accuracy) + tint * 0.07 + (tier === 4 ? 0.12 : 0), 0, 1);

  return {
    tier,
    luminosity,
    coreSigma,
    psfRadius,
    psfGain,
    rayLengthH: rayLength,
    rayLengthV: rayLength * verticalRatio,
    rayGain,
    rayAngle: tilt * angleSpread,
    diagGain,
    temperature,
    // 불안정한 별일수록 조금 더 반짝인다(그래도 최대 몇 %)
    twinkleAmp: lerp(0.05, 0.015, clarity),
    twinkleSpeed: lerp(0.45, 1.0, speedJitter),
    phase,
  };
}
