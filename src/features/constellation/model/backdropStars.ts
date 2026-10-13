// 배경 별 생성기(순수 데이터). 실제 맑은 밤하늘처럼: 대부분 아주 작고 희미한 점, 소수의 또렷한 별, 극소수의 밝은 별.
// 위치는 화면 높이=1인 평면(p 좌표)에 만든다. 화면비·resize와 무관하게 같은 하늘이고, 화면 밖으로 나간 별은 그냥 잘린다.
import { createRng } from "@/features/constellation/model/rng";
import { DENSITY_MAX, starDensity } from "@/features/constellation/model/skyDensity";

export const BACKDROP_SEED = 20261003;
/** 생성 영역(높이 단위). 21:9 울트라와이드까지 덮는다. */
export const FIELD_HALF_WIDTH = 1.3;
export const FIELD_HALF_HEIGHT = 0.52;
/** 밀도 장에서 뽑는 "주" 별 수. 군집 동반성이 약 8% 더해져 16:9 화면에는 약 1400개가 보인다. */
const PRIMARY_COUNT = 2000;

export interface BackdropStarData {
  /** x, y (높이 단위), z = 깊이(0 먼 별 ~ 1 가까운 별) */
  position: Float32Array;
  /** 가우시안 중심의 시그마(CSS px) */
  sigma: Float32Array;
  /** 중심 밝기 0~1 */
  bright: Float32Array;
  /** 0 따뜻함 ~ 1 차가움(0.5가 중립) */
  temp: Float32Array;
  /** 아주 옅은 glow 진폭(0이면 없음) / 반경(CSS px) */
  glow: Float32Array;
  glowRadius: Float32Array;
  /** 회절 ray 길이(CSS px). 0이면 없음 */
  spike: Float32Array;
  phase: Float32Array;
  twinkle: Float32Array;
  /** 0: 거의 sub-pixel, 1: 또렷한 tiny, 2: 비교적 밝은 별 */
  tier: Uint8Array;
  count: number;
}

type Rng = () => number;

function pickTemperature(rng: Rng): number {
  const r = rng();
  if (r < 0.1) return 0.78 + rng() * 0.22; // blue-white (소수)
  if (r < 0.19) return rng() * 0.22; // warm-white (소수)
  return 0.5 + (rng() + rng() - 1) * 0.16; // 대부분 중립~살짝 차갑게
}

export function generateBackdropStars(): BackdropStarData {
  const rng = createRng(BACKDROP_SEED);
  const xs: number[] = [];
  const ys: number[] = [];
  const clusterSeeds: number[] = []; // xs/ys의 인덱스

  // 1) 밀도 장에서 rejection sampling
  let attempts = 0;
  while (xs.length < PRIMARY_COUNT && attempts < PRIMARY_COUNT * 80) {
    attempts++;
    const x = (rng() * 2 - 1) * FIELD_HALF_WIDTH;
    const y = (rng() * 2 - 1) * FIELD_HALF_HEIGHT;
    if (rng() * DENSITY_MAX > starDensity(x, y)) continue;
    xs.push(x);
    ys.push(y);
    if (rng() < 0.025) clusterSeeds.push(xs.length - 1);
  }
  const primaryCount = xs.length;

  // 2) 작은 밀집: 일부 별 곁에 희미한 동반 별 몇 개
  for (const s of clusterSeeds) {
    const k = 2 + Math.floor(rng() * 4);
    for (let j = 0; j < k; j++) {
      const ang = rng() * Math.PI * 2;
      const dist = 0.006 + Math.pow(rng(), 0.7) * 0.026;
      xs.push(xs[s] + Math.cos(ang) * dist);
      ys.push(ys[s] + Math.sin(ang) * dist);
    }
  }

  const count = xs.length;
  const out: BackdropStarData = {
    position: new Float32Array(count * 3),
    sigma: new Float32Array(count),
    bright: new Float32Array(count),
    temp: new Float32Array(count),
    glow: new Float32Array(count),
    glowRadius: new Float32Array(count),
    spike: new Float32Array(count),
    phase: new Float32Array(count),
    twinkle: new Float32Array(count),
    tier: new Uint8Array(count),
    count,
  };

  for (let i = 0; i < count; i++) {
    const isCompanion = i >= primaryCount;
    // 밝기 등급: 대부분 tier 0, 소수 tier 1, 극소수 tier 2. 동반 별은 항상 희미하다.
    const m = rng();
    const tier = isCompanion ? 0 : m < 0.015 ? 2 : m < 0.2 ? 1 : 0;
    out.tier[i] = tier;

    // 깊이: 먼 별(0~0.4)이 더 많다. 먼 별일수록 작고 어둡고 조금 덜 선명하다.
    const z = rng() < 0.6 ? rng() * 0.4 : 0.6 + rng() * 0.4;
    const nearness = 0.78 + 0.22 * z;
    const softness = 1.12 - 0.12 * z;

    let sigma: number;
    let bright: number;
    let glow = 0;
    let glowRadius = 0;
    let spike = 0;
    if (tier === 0) {
      sigma = 0.38 + rng() * 0.22;
      bright = 0.1 + 0.24 * rng() * rng();
    } else if (tier === 1) {
      sigma = 0.5 + rng() * 0.25;
      bright = 0.32 + 0.3 * rng();
      glow = 0.04 + rng() * 0.05;
      glowRadius = 1.2 + rng() * 0.6;
    } else {
      sigma = 0.65 + rng() * 0.3;
      bright = 0.7 + 0.25 * rng();
      glow = 0.1 + rng() * 0.06;
      glowRadius = 1.8 + rng() * 0.8;
      // 가까운(z 큰) 밝은 별 중 일부에만 짧고 섬세한 회절 ray
      if (z > 0.55 && rng() < 0.55) spike = 7 + rng() * 6;
    }
    out.sigma[i] = sigma * softness;
    out.bright[i] = bright * nearness * (isCompanion ? 0.75 : 1);
    out.glow[i] = glow * nearness;
    out.glowRadius[i] = glowRadius;
    out.spike[i] = spike;
    out.temp[i] = Math.min(1, Math.max(0, pickTemperature(rng)));
    out.phase[i] = rng() * Math.PI * 2;
    // 가장 작은 별은 깜빡이지 않는다. 밝은 별만 아주 미세하게.
    out.twinkle[i] = tier === 0 ? 0 : 0.015 + rng() * 0.035;
    out.position[i * 3] = xs[i];
    out.position[i * 3 + 1] = ys[i];
    out.position[i * 3 + 2] = z;
  }
  return out;
}
