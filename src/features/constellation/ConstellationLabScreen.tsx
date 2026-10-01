import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { buildCuratedSky } from "@/features/constellation/model/curatedSky";
import { SkyBackdrop } from "@/features/constellation/scene/SkyBackdrop";
import { SkyScene } from "@/features/constellation/scene/SkyScene";
import type { LabelAnchor } from "@/features/constellation/scene/SkyRig";
import "@/features/constellation/sky.css";

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window === "undefined" ? false : window.matchMedia(query).matches));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

function useViewportSize() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

/**
 * Phase 1: 별의 시각 품질만 확인하는 독립 prototype. 소수의 curated mock 별자리를 쓰며 IndexedDB를 읽거나 쓰지 않는다.
 * UI는 최소한(Home 링크, 라벨)으로 두고 Detail Panel/클릭 이동은 구현하지 않는다.
 */
export function ConstellationLabScreen() {
  const sky = useMemo(() => buildCuratedSky(), []);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const viewport = useViewportSize();
  const webgl = useMemo(() => hasWebGL(), []);
  const [ready, setReady] = useState(false);

  // 첫 프레임이 그려진 뒤에 부드럽게 나타난다(깜빡임 없이 조용히 진입).
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  const labels = useMemo(
    () => [
      ...sky.categories.map((c) => ({ key: `cat:${c.id}`, kind: "category" as const, text: c.label, position: c.anchor })),
      ...sky.constellations.map((c) => ({ key: c.id, kind: "constellation" as const, text: c.label, position: c.labelAnchor })),
    ],
    [sky],
  );
  const labelEls = useRef<(HTMLDivElement | null)[]>([]);
  const anchors = useMemo<LabelAnchor[]>(
    () => labels.map((l, i) => ({ position: l.position, element: () => labelEls.current[i] ?? null })),
    [labels],
  );

  return (
    <main className="sky-root" aria-label="Knowledge Sky">
      <h1 className="sky-sr-only">나의 지식 별자리 (시각 프로토타입)</h1>
      <SkyBackdrop />

      <div className="sky-fade" data-ready={ready}>
        {webgl && <SkyScene sky={sky} reducedMotion={reducedMotion} anchors={anchors} viewport={viewport} coarsePointer={coarsePointer} />}
        {labels.map((l, i) => (
          <div
            key={l.key}
            ref={(el) => {
              labelEls.current[i] = el;
            }}
            className={`sky-label sky-label--${l.kind}`}
            aria-hidden="true"
          >
            {l.text}
          </div>
        ))}
        {!webgl && <p className="sky-note">이 환경에서는 WebGL을 사용할 수 없어 별을 표시하지 못합니다.</p>}
      </div>

      <Link to="/" className="sky-home">
        ← Home
      </Link>

      {/* 스크린리더용: 시각적으로는 숨겨진 별자리 목록 */}
      <ul className="sky-sr-only">
        {sky.constellations.map((c) => (
          <li key={c.id}>
            {c.label}: {c.starIds.length}개 개념
          </li>
        ))}
      </ul>
    </main>
  );
}
