// 화면 맨 아래의 아주 어두운 숲 실루엣(순수 데이터 생성기). 장식이 아니라 "실제 장소에서 올려다본다"는 공간감이 목적이다.
// 침엽수(conifer) 실루엣을 시드 기반으로 만든다: 나무마다 높이·폭·기울기·가지 윤곽·간격이 다르고 일부는 겹친다.
// 중앙 하늘을 최대한 열어 두기 위해 중앙은 낮게, 좌우 가장자리는 조금 높게 올라온다. 이미지 asset과 dependency는 없다.
import { createRng } from "@/features/constellation/model/rng";

const FOREST_SEED = 20261004;

/** 높이 기준(화면 높이 대비). 숲은 전체 높이의 약 6~12% 안에서만 쓴다. */
export const FOREST_MAX_FRACTION = 0.12;
const CENTER_FRACTION = 0.042;
const EDGE_FRACTION = 0.092;

/** 세로 화면(모바일)에서는 하늘을 덜 가리도록 낮춘다. */
export function forestScale(width: number, height: number): number {
  const aspect = width / Math.max(height, 1);
  return aspect < 0.8 ? 0.72 : aspect < 1.1 ? 0.88 : 1;
}

/** 숲 윗선의 대략적인 높이(화면 높이 대비 0~1). 하늘 셰이더의 atmospheric haze가 이 높이를 기준으로 깔린다. */
export function forestHorizon(width: number, height: number): number {
  return (CENTER_FRACTION * 1.35) * forestScale(width, height);
}

export interface ForestLayers {
  /** SVG path data. 좌표는 CSS px, 원점은 숲 영역의 왼쪽 위. */
  far: string;
  near: string;
  /** 숲 영역(SVG)의 높이(px). 가장 높은 나무까지 담는다. */
  height: number;
  treeCount: number;
}

type Rng = () => number;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 침엽수 한 그루의 외곽선. tip에서 시작해 왼쪽 가지를 내려가 바닥을 지나 오른쪽 가지를 올라온다. */
function conifer(rng: Rng, cx: number, baseY: number, h: number, w: number, tilt: number): string {
  const tipX = cx + tilt * h;
  const tipY = baseY - h;
  const tiers = 5 + Math.floor(rng() * 5); // 5~9단
  const axis = (t: number) => tipX + (cx - tipX) * t;
  const half = (t: number) => (w / 2) * (0.1 + 0.9 * Math.pow(t, 0.92));

  const side = (sign: -1 | 1): [number, number][] => {
    const pts: [number, number][] = [];
    let t = 0.06 + rng() * 0.06;
    for (let i = 0; i < tiers && t < 1; i++) {
      const hw = half(t) * (1 + (rng() - 0.35) * 0.28);
      const droop = h * (0.012 + rng() * 0.018);
      pts.push([axis(t) + sign * hw, tipY + t * h + droop]); // 가지 끝(조금 처짐)
      const inset = 0.5 + rng() * 0.25;
      pts.push([axis(t) + sign * hw * inset, tipY + t * h - h * 0.004]); // 안쪽 notch
      t += (1 - 0.1) / tiers * (0.7 + rng() * 0.6);
    }
    pts.push([axis(1) + sign * (w / 2) * (0.92 + rng() * 0.16), baseY]);
    return pts;
  };

  const left = side(-1);
  const right = side(1).reverse();
  const pad = h * 0.5; // 바닥 아래까지 닫아 아래 경계가 보이지 않게
  const poly: [number, number][] = [[tipX, tipY], ...left, [left[left.length - 1][0], baseY + pad], [right[0][0], baseY + pad], ...right];
  return "M" + poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z";
}

/** 한 레이어의 나무들. depth 0이 가까운 나무(크고 어두움), 1이 먼 나무(작고 조금 옅음). */
function layer(rng: Rng, width: number, vh: number, scale: number, far: boolean): { d: string; count: number; top: number } {
  const maxH = vh * FOREST_MAX_FRACTION * scale;
  const baseY = maxH + 2;
  let d = "";
  let count = 0;
  let top = baseY;
  let x = -vh * 0.03 - rng() * 20;
  const heightScale = far ? 0.68 : 1;
  while (x < width + vh * 0.05) {
    const u = Math.abs(((x / width) * 2 - 1));
    // 중앙은 낮고 좌우 끝은 조금 높게. 그 위에 나무마다 큰 변동.
    const envelope = (CENTER_FRACTION + (EDGE_FRACTION - CENTER_FRACTION) * smooth(0.5, 1, u)) * vh * scale * heightScale;
    let h = envelope * (0.55 + rng() * 0.7);
    // 가장자리에서 가끔 더 높은 나무, 중앙에서는 가끔 아주 낮은 구간
    if (u > 0.78 && rng() < 0.18) h = Math.min(maxH * 0.98, h * 1.25);
    if (u < 0.45 && rng() < 0.12) h *= 0.55;
    h = Math.min(h, maxH * (far ? 0.82 : 1));
    const w = h * (0.3 + rng() * 0.16);
    const tilt = (rng() - 0.5) * 0.06;
    d += conifer(rng, x, baseY, h, w, tilt);
    top = Math.min(top, baseY - h);
    count++;
    // 간격은 불규칙: 대부분 겹치고, 가끔 빈 틈
    let step = w * (0.28 + rng() * 0.5);
    if (rng() < 0.07) step += w * (0.8 + rng() * 1.5);
    x += Math.max(step, 3);
  }
  return { d, count, top };
}

/** 나무 사이 틈으로 하늘이 바닥까지 비치지 않도록 깔아 두는 낮고 불규칙한 지면/덤불 띠. */
function ground(rng: Rng, width: number, baseY: number, vh: number): string {
  const amp = Math.max(3, vh * 0.012);
  let d = `M-10 ${(baseY + 6).toFixed(1)}`;
  for (let x = -10; x <= width + 30; x += 18 + rng() * 26) {
    d += `L${x.toFixed(1)} ${(baseY - rng() * amp).toFixed(1)}`;
  }
  return d + `L${width + 30} ${(baseY + 6).toFixed(1)}Z`;
}

export function generateForest(width: number, height: number): ForestLayers {
  const scale = forestScale(width, height);
  const rng = createRng(FOREST_SEED);
  const farLayer = layer(rng, width, height, scale, true);
  const nearLayer = layer(rng, width, height, scale, false);
  const svgHeight = Math.ceil(height * FOREST_MAX_FRACTION * scale) + 4;
  const floor = ground(rng, width, height * FOREST_MAX_FRACTION * scale + 2, height);
  return { far: farLayer.d + floor, near: nearLayer.d + floor, height: svgHeight, treeCount: farLayer.count + nearLayer.count };
}
