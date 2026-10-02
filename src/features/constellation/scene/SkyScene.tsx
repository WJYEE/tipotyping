import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import type { SkyData } from "@/features/constellation/model/types";
import { ConstellationLines } from "@/features/constellation/scene/ConstellationLines";
import { BackdropStars } from "@/features/constellation/scene/BackdropStars";
import { KnowledgeStars } from "@/features/constellation/scene/KnowledgeStars";
import { CAMERA_FOV, CAMERA_START_Z, IdleTicker, LabelProjector, SkyRig, type LabelAnchor, type Parallax } from "@/features/constellation/scene/SkyRig";

interface SkySceneProps {
  sky: SkyData;
  reducedMotion: boolean;
  anchors: LabelAnchor[];
  coarsePointer: boolean;
}

export function SkyScene({ sky, reducedMotion, anchors, coarsePointer }: SkySceneProps) {
  const parallax = useRef<Parallax>({ x: 0, y: 0 });

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
      <BackdropStars reducedMotion={reducedMotion} parallax={parallax} />
      <ConstellationLines constellations={sky.constellations} stars={sky.stars} />
      <KnowledgeStars stars={sky.stars} reducedMotion={reducedMotion} />
      <LabelProjector anchors={anchors} />
    </Canvas>
  );
}
