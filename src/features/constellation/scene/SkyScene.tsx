import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import type { SkyData } from "@/features/constellation/model/types";
import { ConstellationLines } from "@/features/constellation/scene/ConstellationLines";
import { BackdropStars } from "@/features/constellation/scene/BackdropStars";
import { StarPicker } from "@/features/constellation/scene/StarPicker";
import { KnowledgeStars } from "@/features/constellation/scene/KnowledgeStars";
import { CAMERA_FOV, CAMERA_START_Z, IdleTicker, LabelProjector, SkyRig, type LabelAnchor, type Parallax } from "@/features/constellation/scene/SkyRig";

interface SkySceneProps {
  sky: SkyData;
  reducedMotion: boolean;
  anchors: LabelAnchor[];
  coarsePointer: boolean;
  /** Focus된 별. null이면 Universe(Overview). */
  selectedStarId: string | null;
  hoveredStarId: string | null;
  onHoverStar: (starId: string | null) => void;
  /** 별을 눌렀으면 id, 빈 하늘이면 null */
  onPickStar: (starId: string | null) => void;
}

export function SkyScene({
  sky,
  reducedMotion,
  anchors,
  coarsePointer,
  selectedStarId,
  hoveredStarId,
  onHoverStar,
  onPickStar,
}: SkySceneProps) {
  const parallax = useRef<Parallax>({ x: 0, y: 0 });
  const focus = useMemo(() => sky.stars.find((s) => s.id === selectedStarId)?.position ?? null, [sky, selectedStarId]);

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
      <SkyRig reducedMotion={reducedMotion} parallax={parallax} focus={focus} />
      <IdleTicker reducedMotion={reducedMotion} />
      <BackdropStars reducedMotion={reducedMotion} parallax={parallax} />
      <ConstellationLines constellations={sky.constellations} stars={sky.stars} />
      <KnowledgeStars stars={sky.stars} reducedMotion={reducedMotion} hoveredId={hoveredStarId} selectedId={selectedStarId} />
      <StarPicker stars={sky.stars} coarsePointer={coarsePointer} onHover={onHoverStar} onPick={onPickStar} />
      <LabelProjector anchors={anchors} />
    </Canvas>
  );
}
