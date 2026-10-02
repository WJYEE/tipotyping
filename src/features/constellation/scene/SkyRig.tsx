import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import {
  BASE_DISTANCE,
  CAMERA_FOV_DEG,
  CAMERA_LAMBDA,
  clampDt,
  damp,
  dampPose,
  focusPose,
  overviewPose,
  parallaxScale,
  poseSettled,
  type CameraPose,
} from "@/features/constellation/model/starFocus";
import type { Vec3 } from "@/features/constellation/model/types";

export interface Parallax {
  x: number;
  y: number;
}

/** 포인터에 따른 카메라 이동 폭(월드 단위). 아주 미세한 깊이감만 만든다. */
const PARALLAX_X = 1.5;
const PARALLAX_Y = 1.0;
const PARALLAX_SMOOTHING = 0.045;

export const CAMERA_FOV = CAMERA_FOV_DEG;
export const CAMERA_START_Z = BASE_DISTANCE;

/**
 * 카메라 거리 + 포인터 시차 + Star Focus. reduced-motion이면 시차 없이 정지한 카메라를 쓰고 Focus는 즉시 이동한다.
 * 시차 값은 배경 별 셰이더도 함께 사용한다.
 *
 * Overview: 승인된 Universe framing(바라보는 점 = 원점, 거리 = overviewDistance). Focus가 없으면 기존과 동일하다.
 * Focus: 선택된 별을 향해 바라보는 점과 거리가 지수 감쇠로 부드럽게 이동한다(프레임레이트 무관, 도중에 목표가 바뀌어도 끊기지 않는다).
 * 이동이 끝나면 더 이상 frame을 요청하지 않는다(demand 렌더링 유지).
 */
export function SkyRig({
  reducedMotion,
  parallax,
  focus,
}: {
  reducedMotion: boolean;
  parallax: MutableRefObject<Parallax>;
  /** Focus된 별의 월드 좌표. null이면 Overview. */
  focus: Vec3 | null;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const target = useRef<Parallax>({ x: 0, y: 0 });
  const pose = useRef<CameraPose | null>(null);
  const focusMix = useRef(0);
  const lastAspect = useRef(0);

  useEffect(() => {
    if (reducedMotion) {
      parallax.current.x = 0;
      parallax.current.y = 0;
      return;
    }
    function onMove(e: PointerEvent) {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    }
    function onLeave() {
      target.current.x = 0;
      target.current.y = 0;
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [reducedMotion, parallax]);

  // 화면 크기나 Focus 대상이 바뀌면 다시 그려 목표 pose로 향하게 한다.
  useEffect(() => {
    invalidate();
  }, [size.width, size.height, focus, invalidate]);

  useFrame((_, delta) => {
    const aspect = size.width / Math.max(size.height, 1);
    const goal = focus ? focusPose(focus, aspect) : overviewPose(aspect);
    const dt = clampDt(delta);

    // 첫 프레임, reduced-motion, 창 크기 변경 때는 부드럽게 따라가지 않고 목표에 바로 놓는다(기존 resize 동작 유지).
    let current = pose.current;
    if (!current || reducedMotion || aspect !== lastAspect.current) {
      current = goal;
      focusMix.current = focus ? 1 : 0;
    } else {
      current = dampPose(current, goal, CAMERA_LAMBDA, dt);
      focusMix.current = damp(focusMix.current, focus ? 1 : 0, CAMERA_LAMBDA, dt);
    }
    lastAspect.current = aspect;
    const settled = poseSettled(current, goal);
    if (settled) {
      current = goal;
      focusMix.current = focus ? 1 : 0;
    }
    pose.current = current;

    const p = parallax.current;
    if (!reducedMotion) {
      p.x += (target.current.x - p.x) * PARALLAX_SMOOTHING;
      p.y += (target.current.y - p.y) * PARALLAX_SMOOTHING;
    }
    // Focus 중에는 시차를 줄여 선택된 별이 흔들려 보이지 않게 한다(Overview에서는 배율 1 = 기존 동작).
    const k = parallaxScale(focusMix.current);
    camera.position.set(current.tx + p.x * PARALLAX_X * k, current.ty + p.y * PARALLAX_Y * k, current.distance);
    camera.lookAt(current.tx, current.ty, 0);
    // 라벨/picking이 같은 프레임의 카메라 행렬로 투영하도록 갱신한다.
    camera.updateMatrixWorld();

    if (!settled) invalidate();
  });

  return null;
}

/**
 * Canvas 안에서 움직이지 않고 있을 때도 별이 아주 느리게 반짝이도록 30fps로만 다시 그린다(60fps보다 GPU 부담이 작다).
 * 탭이 보이지 않으면 멈춘다. reduced-motion이면 만들지 않는다(정지 화면은 resize 때만 다시 그린다).
 */
export function IdleTicker({ reducedMotion }: { reducedMotion: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      if (!document.hidden) invalidate();
    }, 1000 / 30);
    return () => window.clearInterval(id);
  }, [reducedMotion, invalidate]);
  return null;
}

export interface LabelAnchor {
  position: Vec3;
  /** 라벨 DOM 요소를 돌려주는 함수(ref 배열의 항목) */
  element: () => HTMLElement | null;
}

/** 월드 좌표의 라벨 위치를 화면 좌표로 투영해 DOM에 직접 반영한다(React state를 거치지 않는다). */
export function LabelProjector({ anchors }: { anchors: LabelAnchor[] }) {
  const v = useRef(new Vector3());
  useFrame(({ camera, size }) => {
    for (const a of anchors) {
      const el = a.element();
      if (!el) continue;
      v.current.set(a.position[0], a.position[1], a.position[2]).project(camera);
      const x = (v.current.x * 0.5 + 0.5) * size.width;
      const y = (-v.current.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
  });
  return null;
}
