import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { hitRadius, pickStar, type ScreenPoint } from "@/features/constellation/model/starFocus";
import type { StarNode } from "@/features/constellation/model/types";

interface StarPickerProps {
  stars: StarNode[];
  coarsePointer: boolean;
  onHover: (starId: string | null) => void;
  /** 별을 눌렀으면 그 별의 id, 빈 하늘을 눌렀으면 null */
  onPick: (starId: string | null) => void;
}

/**
 * Knowledge Star picking. 렌더링과 완전히 분리된, 아무것도 그리지 않는 CPU 화면공간 hit test다.
 * 별 위치를 카메라로 투영해 포인터와 가장 가까운 별을 고른다(보이지 않는 원형 hit 영역, 반경은 starFocus.hitRadius).
 * 별 개수만큼의 투영만 하며, 포인터 이벤트가 있을 때만 계산하므로 draw call/렌더 루프에 영향이 없다.
 * raycast를 쓰지 않는 이유: 별은 화면 픽셀 크기가 고정인 shader quad라 월드 공간 mesh 충돌과 일치하지 않는다.
 */
export function StarPicker({ stars, coarsePointer, onHover, onPick }: StarPickerProps) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scratch = useRef(new Vector3());
  // 콜백은 매 렌더 새로 만들어질 수 있으므로 ref로 최신 값을 읽는다(이벤트 리스너를 다시 달지 않는다).
  const handlers = useRef({ onHover, onPick });
  useEffect(() => {
    handlers.current = { onHover, onPick };
  });

  useEffect(() => {
    const el = gl.domElement;
    const radius = hitRadius(coarsePointer);
    let hovered: string | null = null;

    function hit(e: PointerEvent | MouseEvent): string | null {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      camera.updateMatrixWorld();
      const points: ScreenPoint[] = stars.map((s) => {
        scratch.current.set(s.position[0], s.position[1], s.position[2]).project(camera);
        return { x: (scratch.current.x * 0.5 + 0.5) * rect.width, y: (-scratch.current.y * 0.5 + 0.5) * rect.height };
      });
      const index = pickStar(points, e.clientX - rect.left, e.clientY - rect.top, radius);
      return index >= 0 ? stars[index].id : null;
    }

    function setHover(id: string | null) {
      if (id === hovered) return;
      hovered = id;
      el.style.cursor = id ? "pointer" : "";
      handlers.current.onHover(id);
    }

    function onMove(e: PointerEvent) {
      // 터치에는 hover가 없다.
      if (e.pointerType === "touch") return;
      setHover(hit(e));
    }
    function onLeave() {
      setHover(null);
    }
    function onClick(e: MouseEvent) {
      handlers.current.onPick(hit(e));
    }

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("click", onClick);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("click", onClick);
      el.style.cursor = "";
      if (hovered !== null) handlers.current.onHover(null);
    };
  }, [gl, camera, stars, coarsePointer]);

  return null;
}
