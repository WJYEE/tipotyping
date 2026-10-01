import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import type { SkyData } from "@/features/constellation/model/types";
import { ConstellationLines } from "@/features/constellation/scene/ConstellationLines";
import { BackdropStars, KnowledgeStars } from "@/features/constellation/scene/StarPoints";
import { CAMERA_FOV, CAMERA_START_Z, IdleTicker, LabelProjector, SkyRig, type LabelAnchor, type Parallax } from "@/features/constellation/scene/SkyRig";

/** 배경 별 개수는 화면 면적에 비례(밀도 일정)하되 100단위로만 바꿔 resize 때 별이 계속 바뀌지 않게 한다. */
function backdropCount(width: number, height: number, coarse: boolean): number {
  const raw = (width * height) / (coarse ? 700 : 820);
  return Math.min(2600, Math.max(600, Math.round(raw / 100) * 100));
}

interface SkySceneProps {
  sky: SkyData;
  reducedMotion: boolean;
  anchors: LabelAnchor[];
  viewport: { width: number; height: number };
  coarsePointer: boolean;
}

export function SkyScene({ sky, reducedMotion, anchors, viewport, coarsePointer }: SkySceneProps) {
  const parallax = useRef<Parallax>({ x: 0, y: 0 });
  const count = useMemo(() => backdropCount(viewport.width, viewport.height, coarsePointer), [viewport.width, viewport.height, coarsePointer]);

  return (
    <Canvas
      // 항상 그리는 대신 30fps로만 다시 그린다(IdleTicker). reduced-motion이면 resize 때만 그린다.
      frameloop="demand"
      flat
      dpr={[1, coarsePointer ? 1.25 : 1.75]}
      camera={{ fov: CAMERA_FOV, position: [0, 0, CAMERA_START_Z], near: 1, far: 800 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <SkyRig reducedMotion={reducedMotion} parallax={parallax} />
      <IdleTicker reducedMotion={reducedMotion} />
      <BackdropStars count={count} reducedMotion={reducedMotion} parallax={parallax} />
      <ConstellationLines constellations={sky.constellations} stars={sky.stars} />
      <KnowledgeStars stars={sky.stars} reducedMotion={reducedMotion} />
      <LabelProjector anchors={anchors} />
    </Canvas>
  );
}
