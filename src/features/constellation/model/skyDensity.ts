// 배경 별 밀도 장. Sky Layer 셰이더(skyShader.ts)의 Milky Way FBM을 JS로 옮겨 같은 구조를 공유한다.
// 좌표계는 셰이더의 p와 같다: 화면 높이가 1, 중심이 (0,0), y는 위쪽이 +.
// 별의 밀도 = (빈 공간 ↔ 별 있는 하늘) × 작은 덩어리 변화 × Milky Way 쪽 약간 높은 밀도 × 먼지 띠에서 감소.

import { DEFAULT_SKY_PARAMS } from "@/features/constellation/scene/skyParams";

const fract = (x: number) => x - Math.floor(x);
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function hash12(px: number, py: number): number {
  let x = fract(px * 0.1031);
  let y = fract(py * 0.1031);
  let z = fract(px * 0.1031);
  const d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
  x += d;
  y += d;
  z += d;
  return fract((x + y) * z);
}

function vnoise(px: number, py: number): number {
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  let fx = px - ix;
  let fy = py - iy;
  fx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  fy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash12(ix, iy);
  const b = hash12(ix + 1, iy);
  const c = hash12(ix, iy + 1);
  const d = hash12(ix + 1, iy + 1);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return top + (bottom - top) * fy;
}

export function fbm(px: number, py: number): number {
  let sum = 0;
  let amp = 0.5;
  for (let i = 0; i < 4; i++) {
    sum += amp * vnoise(px, py);
    const nx = 0.8 * px + 0.6 * py;
    const ny = -0.6 * px + 0.8 * py;
    px = nx * 2.03 + 17;
    py = ny * 2.03 + 17;
    amp *= 0.5;
  }
  return sum / 0.9375;
}

const SEED = DEFAULT_SKY_PARAMS.seed;
const SX = SEED;
const SY = SEED * 0.37;
const ANGLE = -0.52;
const COS = Math.cos(ANGLE);
const SIN = Math.sin(ANGLE);

/** skyShader.ts의 Milky Way 밀도(band·along·cloud)와 먼지 띠. 0~약 1.4. */
export function milkyWayStructure(px: number, py: number): { density: number; dust: number } {
  const qx = COS * px + SIN * py;
  const qy = -SIN * px + COS * py;
  const bend = (fbm(qx * 0.9 + 5 + SX, 2.3 + SY) - 0.5) * 0.34;
  const d = qy - bend;
  const band = Math.exp(-Math.pow(d / 0.3, 2));
  const along = 0.55 + 0.45 * fbm(qx * 0.8 - 4 + SX, 8.1 + SY);
  const cloud = 0.35 + 1.15 * fbm(qx * 2.4 + SX * 1.3, qy * 2.4 + SY * 1.3);
  const dust = smoothstep(0.52, 0.78, fbm(qx * 3.6 + 11 + SX, qy * 5.2 + 11 + SY));
  return { density: band * along * cloud, dust: dust * band };
}

/** 별 밀도 상대값. 대략 0(비어 있음) ~ DENSITY_MAX. */
export const DENSITY_MAX = 2.4;

export function starDensity(px: number, py: number): number {
  // 1) 큰 규모의 빈 공간: 낮은 값 영역은 거의 비어 있다.
  const openness = smoothstep(0.34, 0.58, fbm(px * 1.5 + 40, py * 1.5 + 40));
  const base = 0.03 + 0.97 * openness;
  // 2) 중간 규모의 덩어리: 밀집/듬성 변화
  const clump = 0.45 + 0.75 * smoothstep(0.3, 0.72, fbm(px * 4.2 - 21, py * 4.2 + 9));
  // 3) Milky Way 쪽이 약간 더 촘촘하고, 먼지 띠에서는 줄어든다.
  const mw = milkyWayStructure(px, py);
  const galactic = 1 + 0.9 * Math.min(1.4, mw.density) - 0.55 * mw.dust;
  return base * clump * Math.max(0.2, galactic);
}
