import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import type { Vec3 } from "@/features/constellation/model/types";

export interface Parallax {
  x: number;
  y: number;
}

/** 화면 전체 폭에 곡선 배치(약 100 월드 단위)가 들어오도록 카메라 거리를 정한다(세로 화면은 더 멀리). */
const BASE_DISTANCE = 100;
const FIT_WIDTH_FACTOR = 137;
const FOV_DEG = 40;
/** 포인터에 따른 카메라 이동 폭(월드 단위). 아주 미세한 깊이감만 만든다. */
const PARALLAX_X = 1.5;
const PARALLAX_Y = 1.0;
const PARALLAX_SMOOTHING = 0.045;

export const CAMERA_FOV = FOV_DEG;
export const CAMERA_START_Z = BASE_DISTANCE;

/**
 * 카메라 거리 + 포인터 시차. reduced-motion이면 시차 없이 정지한 카메라를 쓴다.
 * 시차 값은 배경 별 셰이더도 함께 사용한다.
 */
export function SkyRig({ reducedMotion, parallax }: { reducedMotion: boolean; parallax: MutableRefObject<Parallax> }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const target = useRef<Parallax>({ x: 0, y: 0 });

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

  const distance = Math.max(BASE_DISTANCE, FIT_WIDTH_FACTOR / Math.max(size.width / size.height, 0.2));

  useEffect(() => {
    invalidate();
  }, [distance, invalidate]);

  useFrame(() => {
    const p = parallax.current;
    if (!reducedMotion) {
      p.x += (target.current.x - p.x) * PARALLAX_SMOOTHING;
      p.y += (target.current.y - p.y) * PARALLAX_SMOOTHING;
    }
    camera.position.set(p.x * PARALLAX_X, p.y * PARALLAX_Y, distance);
    camera.lookAt(0, 0, 0);
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
