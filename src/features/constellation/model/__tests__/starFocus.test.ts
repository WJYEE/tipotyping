import { describe, expect, it } from "vitest";
import {
  CAMERA_FOV_DEG,
  CAMERA_LAMBDA,
  DIM_FACTOR,
  FOCUS_DISTANCE_RATIO,
  FOCUS_PARALLAX_SCALE,
  HIT_RADIUS_COARSE,
  HIT_RADIUS_FINE,
  clampDt,
  damp,
  dampPose,
  emphasisTarget,
  focusAnchor,
  focusPose,
  hitRadius,
  overviewDistance,
  overviewPose,
  parallaxScale,
  pickStar,
  poseSettled,
  selectionAfterEscape,
  selectionAfterPick,
} from "@/features/constellation/model/starFocus";

describe("pickStar", () => {
  const pts = [
    { x: 100, y: 100 },
    { x: 130, y: 100 },
    { x: 400, y: 300 },
  ];

  it("반경 안에서 가장 가까운 별을 고른다", () => {
    expect(pickStar(pts, 112, 100, 22)).toBe(0);
    expect(pickStar(pts, 120, 100, 22)).toBe(1);
  });

  it("반경 밖이면 -1(빈 하늘)", () => {
    expect(pickStar(pts, 250, 200, 22)).toBe(-1);
    expect(pickStar([], 10, 10, 22)).toBe(-1);
  });

  it("거리가 같으면 index가 낮은 별(결정적)", () => {
    expect(pickStar(pts, 115, 100, 22)).toBe(0);
  });

  it("밀집해도 같은 입력은 항상 같은 결과", () => {
    const a = pickStar(pts, 117, 104, 30);
    for (let i = 0; i < 5; i++) expect(pickStar(pts, 117, 104, 30)).toBe(a);
  });

  it("거친 포인터는 더 넓은 hit 영역을 쓴다", () => {
    expect(hitRadius(false)).toBe(HIT_RADIUS_FINE);
    expect(hitRadius(true)).toBe(HIT_RADIUS_COARSE);
    expect(HIT_RADIUS_COARSE).toBeGreaterThan(HIT_RADIUS_FINE);
  });
});

describe("camera pose", () => {
  it("Overview 거리는 승인된 framing 공식과 같다(16:9, 세로 화면)", () => {
    expect(overviewDistance(16 / 9)).toBe(Math.max(100, 137 / (16 / 9)));
    expect(overviewDistance(16 / 9)).toBe(100);
    expect(overviewDistance(0.5)).toBe(274);
    expect(overviewPose(1.6)).toEqual({ tx: 0, ty: 0, distance: overviewDistance(1.6) });
  });

  it("Focus는 Overview보다 조금만 가깝다", () => {
    const star: [number, number, number] = [-46, 15, 1.5];
    for (const aspect of [16 / 9, 16 / 10, 21 / 9, 9 / 19]) {
      const pose = focusPose(star, aspect);
      expect(pose.distance).toBeCloseTo(overviewDistance(aspect) * FOCUS_DISTANCE_RATIO, 9);
      expect(pose.distance).toBeLessThan(overviewDistance(aspect));
    }
  });

  it("Focus된 별은 anchor 위치(화면 중앙에서 약간 비킨 곳)에 투영된다", () => {
    const star: [number, number, number] = [26.5, -17, -1];
    for (const aspect of [16 / 9, 16 / 10, 21 / 9, 9 / 19]) {
      const pose = focusPose(star, aspect);
      const halfH = pose.distance * Math.tan((CAMERA_FOV_DEG * Math.PI) / 360);
      const halfW = halfH * aspect;
      const { nx, ny } = focusAnchor(aspect);
      expect((star[0] - pose.tx) / halfW).toBeCloseTo(nx, 9);
      expect((star[1] - pose.ty) / halfH).toBeCloseTo(ny, 9);
    }
  });

  it("가로 화면은 별을 왼쪽으로 비켜 context 공간을 남기고, 세로 화면은 중앙에 가깝다", () => {
    expect(focusAnchor(16 / 9).nx).toBeLessThan(0);
    expect(focusAnchor(9 / 19).nx).toBe(0);
  });

  it("같은 입력은 같은 pose(결정적)", () => {
    expect(focusPose([1, 2, 3], 1.7)).toEqual(focusPose([1, 2, 3], 1.7));
  });
});

describe("damp (frame-rate independent)", () => {
  it("dt=0이면 그대로, 시간이 지나면 목표에 수렴", () => {
    expect(damp(5, 10, CAMERA_LAMBDA, 0)).toBe(5);
    let v = 0;
    for (let i = 0; i < 240; i++) v = damp(v, 10, CAMERA_LAMBDA, 1 / 60);
    expect(v).toBeCloseTo(10, 3);
  });

  it("프레임 분할과 무관하게 같은 시간 뒤 같은 값", () => {
    const one = damp(0, 10, CAMERA_LAMBDA, 0.5);
    let two = 0;
    for (let i = 0; i < 5; i++) two = damp(two, 10, CAMERA_LAMBDA, 0.1);
    let many = 0;
    for (let i = 0; i < 30; i++) many = damp(many, 10, CAMERA_LAMBDA, 0.5 / 30);
    expect(two).toBeCloseTo(one, 9);
    expect(many).toBeCloseTo(one, 9);
  });

  it("목표를 넘어서지 않고(overshoot 없음) 단조롭게 접근", () => {
    let v = 0;
    let prev = 0;
    for (let i = 0; i < 100; i++) {
      v = damp(v, 10, CAMERA_LAMBDA, 1 / 30);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeLessThanOrEqual(10);
      prev = v;
    }
  });

  it("도중에 목표가 바뀌어도(A→B) 현재 위치에서 이어진다", () => {
    const a = focusPose([-40, 10, 0], 16 / 9);
    const b = focusPose([30, -10, 0], 16 / 9);
    let pose = overviewPose(16 / 9);
    for (let i = 0; i < 20; i++) pose = dampPose(pose, a, CAMERA_LAMBDA, 1 / 60);
    const mid = { ...pose };
    pose = dampPose(pose, b, CAMERA_LAMBDA, 1 / 60);
    expect(Math.abs(pose.tx - mid.tx)).toBeLessThan(Math.abs(b.tx - a.tx));
    expect(poseSettled(pose, b)).toBe(false);
    for (let i = 0; i < 600; i++) pose = dampPose(pose, b, CAMERA_LAMBDA, 1 / 60);
    expect(poseSettled(pose, b)).toBe(true);
  });

  it("clampDt는 비정상적으로 긴 프레임을 제한한다", () => {
    expect(clampDt(-1)).toBe(0);
    expect(clampDt(0.016)).toBe(0.016);
    expect(clampDt(5)).toBeLessThanOrEqual(0.05);
  });
});

describe("parallax during focus", () => {
  it("Overview는 기존 동작(배율 1), Focus에서는 줄어든다", () => {
    expect(parallaxScale(0)).toBe(1);
    expect(parallaxScale(1)).toBeCloseTo(FOCUS_PARALLAX_SCALE, 9);
    expect(parallaxScale(0.5)).toBeLessThan(1);
    expect(parallaxScale(-3)).toBe(1);
    expect(parallaxScale(9)).toBeCloseTo(FOCUS_PARALLAX_SCALE, 9);
  });
});

describe("selection state", () => {
  it("별을 누르면 선택, 빈 하늘/ESC는 Universe(null)로 복귀", () => {
    expect(selectionAfterPick("SQL:JOIN")).toBe("SQL:JOIN");
    expect(selectionAfterPick(null)).toBeNull();
    expect(selectionAfterEscape()).toBeNull();
  });

  it("선택된 상태에서 다른 별을 누르면 A→B로 직접 전환", () => {
    let selected: string | null = selectionAfterPick("A");
    selected = selectionAfterPick("B");
    expect(selected).toBe("B");
  });
});

describe("emphasisTarget", () => {
  it("아무것도 선택/hover되지 않으면 모든 별이 배율 1(기존 외형 그대로)", () => {
    for (let i = 0; i < 5; i++) expect(emphasisTarget(i, -1, -1)).toBe(1);
  });

  it("hover는 아주 조금만, Focus 중 다른 별은 사라지지 않고 약간만 낮아진다", () => {
    expect(emphasisTarget(1, 1, -1)).toBeGreaterThan(1);
    expect(emphasisTarget(1, 1, -1)).toBeLessThan(1.25);
    expect(emphasisTarget(0, -1, 2)).toBe(DIM_FACTOR);
    expect(DIM_FACTOR).toBeGreaterThan(0.6);
    expect(emphasisTarget(2, -1, 2)).toBeGreaterThan(1);
  });
});
