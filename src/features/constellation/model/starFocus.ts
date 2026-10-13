// Stellation의 Star 선택/Focus에 쓰는 순수 함수 모음. three/React에 의존하지 않아 결정적으로 테스트할 수 있다.
// 별의 외형(starVisual/셰이더)은 여기서 다루지 않는다: 선택·hover·카메라 pose·화면 hit 판정만 책임진다.
import type { Vec3 } from "@/features/constellation/model/types";

export interface ScreenPoint {
  x: number;
  y: number;
}

/** 별이 매우 작으므로 보이는 픽셀이 아니라 별 주변의 보이지 않는 원형 hit 영역(CSS px 반경)으로 선택한다. */
export const HIT_RADIUS_FINE = 22;
export const HIT_RADIUS_COARSE = 32;

export function hitRadius(coarsePointer: boolean): number {
  return coarsePointer ? HIT_RADIUS_COARSE : HIT_RADIUS_FINE;
}

/**
 * 포인터에서 가장 가까운 별의 index. radius 안에 별이 없으면 -1.
 * 별이 밀집해도 "가장 가까운 별"이 이기고, 거리가 같으면 index가 낮은 별이 이긴다(결정적).
 */
export function pickStar(points: readonly ScreenPoint[], x: number, y: number, radius: number): number {
  let best = -1;
  let bestDist2 = radius * radius;
  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - x;
    const dy = points[i].y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDist2) {
      best = i;
      bestDist2 = d2;
    }
  }
  return best;
}

// ───────── 카메라 ─────────

/** 승인된 Overview framing: 화면 전체 폭에 곡선 배치(약 100 월드 단위)가 들어오도록 카메라 거리를 정한다(세로 화면은 더 멀리). */
export const BASE_DISTANCE = 100;
export const FIT_WIDTH_FACTOR = 137;
export const CAMERA_FOV_DEG = 40;

export function overviewDistance(aspect: number): number {
  return Math.max(BASE_DISTANCE, FIT_WIDTH_FACTOR / Math.max(aspect, 0.2));
}

/** Focus 시 Overview 대비 카메라 거리. 조금만 다가간다(별은 화면에서 일정한 px 크기라 커 보이지 않는다). */
export const FOCUS_DISTANCE_RATIO = 0.92;

export interface CameraPose {
  /** 카메라가 바라보는 점(z=0 평면) */
  tx: number;
  ty: number;
  distance: number;
}

export function overviewPose(aspect: number): CameraPose {
  return { tx: 0, ty: 0, distance: overviewDistance(aspect) };
}

/**
 * Focus된 별이 놓일 화면 위치(NDC, -1~1; +x 오른쪽, +y 위쪽).
 * - 가로 화면: 별을 왼쪽으로 약간 비켜 두어 오른쪽에 향후 Knowledge Context가 들어갈 공간을 남긴다.
 * - 세로(모바일) 화면: 폭이 좁으므로 중앙에 가깝게, 아래쪽 공간만 약간 남긴다.
 */
export function focusAnchor(aspect: number): { nx: number; ny: number } {
  return aspect >= 1 ? { nx: -0.22, ny: 0.04 } : { nx: 0, ny: 0.16 };
}

export function focusPose(star: Vec3, aspect: number, fovDeg: number = CAMERA_FOV_DEG): CameraPose {
  const distance = overviewDistance(aspect) * FOCUS_DISTANCE_RATIO;
  const halfH = distance * Math.tan((fovDeg * Math.PI) / 360);
  const halfW = halfH * aspect;
  const { nx, ny } = focusAnchor(aspect);
  return { tx: star[0] - nx * halfW, ty: star[1] - ny * halfH, distance };
}

/** 프레임레이트와 무관한 지수 감쇠. lambda가 클수록 빠르다(시간상수 = 1/lambda 초). */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  if (dt <= 0) return current;
  return target + (current - target) * Math.exp(-lambda * dt);
}

/** 카메라 이동 속도(1/s). 시간상수 ≈ 0.31s, 약 1.2초 안에 사실상 도착한다. */
export const CAMERA_LAMBDA = 3.2;
/** 별 강조(밝기 배율) 변화 속도(1/s). */
export const EMPHASIS_LAMBDA = 9;
/** 탭이 오래 멈췄다 돌아올 때 한 번에 튀지 않도록 dt를 제한한다(초). */
export const MAX_FRAME_DT = 0.05;

export function clampDt(dt: number): number {
  return Math.min(Math.max(dt, 0), MAX_FRAME_DT);
}

export const POSE_EPSILON = 0.005;

export function dampPose(current: CameraPose, target: CameraPose, lambda: number, dt: number): CameraPose {
  return {
    tx: damp(current.tx, target.tx, lambda, dt),
    ty: damp(current.ty, target.ty, lambda, dt),
    distance: damp(current.distance, target.distance, lambda, dt),
  };
}

export function poseSettled(current: CameraPose, target: CameraPose): boolean {
  return (
    Math.abs(current.tx - target.tx) < POSE_EPSILON &&
    Math.abs(current.ty - target.ty) < POSE_EPSILON &&
    Math.abs(current.distance - target.distance) < POSE_EPSILON
  );
}

/** Focus 중에는 포인터 시차를 줄여 선택된 별이 흔들려 보이지 않게 한다. 1 = Overview(기존 동작 그대로). */
export const FOCUS_PARALLAX_SCALE = 0.2;

export function parallaxScale(focusMix: number): number {
  const m = Math.min(1, Math.max(0, focusMix));
  return 1 + (FOCUS_PARALLAX_SCALE - 1) * m;
}

// ───────── 선택 상태 ─────────

/** 이번 Phase의 interaction state. DB에 저장하지 않는다. null = Universe(Overview). */
export type SelectedStarId = string | null;

/** 별을 눌렀을 때: 별이 있으면 그 별로(다른 별이면 A→B 직접 전환), 빈 하늘이면 Focus를 종료한다. */
export function selectionAfterPick(pickedId: string | null): SelectedStarId {
  return pickedId;
}

export function selectionAfterEscape(): SelectedStarId {
  return null;
}

// ───────── 별 강조(밝기 배율) ─────────
// 기존 별의 외형은 건드리지 않는다. 휴식 상태(배율 1)에서는 기존 값이 비트 단위로 그대로이며,
// hover/Focus 때만 luminosity 배율을 아주 조금 바꾼다.

export const HOVER_BOOST = 1.12;
export const SELECTED_BOOST = 1.17;
/** Focus 중 선택되지 않은 별: 사라지거나 검게 되지 않고 우선순위만 약간 낮아진다. */
export const DIM_FACTOR = 0.9;

export function emphasisTarget(index: number, hoveredIndex: number, selectedIndex: number): number {
  let m = 1;
  if (selectedIndex >= 0) m = index === selectedIndex ? SELECTED_BOOST : DIM_FACTOR;
  if (index === hoveredIndex) m *= HOVER_BOOST;
  return m;
}
