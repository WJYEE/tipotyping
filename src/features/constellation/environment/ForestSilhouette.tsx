import { useEffect, useMemo, useRef, useState } from "react";
import { generateForest } from "@/features/constellation/environment/forestLayout";

// 하늘 가장 낮은 곳보다 확실히 어두운 blue-black. 먼 나무는 하늘과 아주 조금만 구분되고, 가까운 나무가 가장 어둡다.
const FAR_COLOR = "#05080f";
const NEAR_COLOR = "#020309";

/**
 * 화면 아래의 정적인 숲 실루엣. 장식 요소라 접근성 트리에서 숨기고 입력을 가로채지 않는다.
 * 크기가 바뀔 때만 SVG path를 다시 만든다(애니메이션·렌더 루프 없음).
 */
export function ForestSilhouette() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const measure = () => {
      const w = Math.round(parent.clientWidth);
      const h = Math.round(parent.clientHeight);
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  const forest = useMemo(() => (size ? generateForest(size.w, size.h) : null), [size]);

  return (
    <div ref={ref} className="sky-forest" aria-hidden="true">
      {forest && size && (
        <svg
          width="100%"
          height={forest.height}
          viewBox={`0 0 ${size.w} ${forest.height}`}
          preserveAspectRatio="none"
          style={{ display: "block" }}
        >
          <path d={forest.far} fill={FAR_COLOR} />
          <path d={forest.near} fill={NEAR_COLOR} />
        </svg>
      )}
    </div>
  );
}
