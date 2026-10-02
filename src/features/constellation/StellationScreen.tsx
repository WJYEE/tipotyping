import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { selectionAfterEscape, selectionAfterPick } from "@/features/constellation/model/starFocus";
import { buildCuratedSky } from "@/features/constellation/model/curatedSky";
import { ForestSilhouette } from "@/features/constellation/environment/ForestSilhouette";
import { SkyBackdrop } from "@/features/constellation/scene/SkyBackdrop";
import { SkyScene } from "@/features/constellation/scene/SkyScene";
import type { Vec3 } from "@/features/constellation/model/types";
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

/**
 * Stellation: 나의 학습과 커리어가 만들어가는 Knowledge Universe. 정식 route는 /stellation이다.
 * 이번 Phase: Knowledge Star를 선택해 카메라가 부드럽게 집중하고, 다시 Universe 전체로 돌아올 수 있다.
 * 데이터는 아직 curated mock(IndexedDB를 읽거나 쓰지 않는다). 선택 상태도 저장하지 않는다.
 */
export function StellationScreen() {
  const sky = useMemo(() => buildCuratedSky(), []);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const webgl = useMemo(() => hasWebGL(), []);
  const [ready, setReady] = useState(false);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [hoveredStarId, setHoveredStarId] = useState<string | null>(null);
  const selectedStar = sky.stars.find((s) => s.id === selectedStarId) ?? null;

  // 첫 프레임이 그려진 뒤에 부드럽게 나타난다(깜빡임 없이 조용히 진입).
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  const exitFocus = useCallback(() => setSelectedStarId(selectionAfterEscape()), []);
  const pickStar = useCallback((starId: string | null) => setSelectedStarId(selectionAfterPick(starId)), []);

  // ESC: Focus 종료(한 번 눌러 Universe로 복귀)
  useEffect(() => {
    if (selectedStarId === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") exitFocus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedStarId, exitFocus]);

  const labels = useMemo(
    () => [
      ...sky.categories.map((c) => ({ key: `cat:${c.id}`, kind: "category" as const, text: c.label, position: c.anchor })),
      ...sky.constellations.map((c) => ({ key: c.id, kind: "constellation" as const, text: c.label, position: c.labelAnchor })),
    ],
    [sky],
  );
  const labelEls = useRef<(HTMLDivElement | null)[]>([]);
  // Focus된 별의 이름 label. 별자리 label과 같은 LabelProjector(월드→화면 투영, DOM 직접 갱신)를 재사용하므로
  // 카메라가 움직이는 동안에도 React state 갱신 없이 별을 따라간다.
  const starLabelEl = useRef<HTMLDivElement>(null);
  const selectedPosition = useRef<Vec3>([0, 0, 0]);
  useEffect(() => {
    if (selectedStar) selectedPosition.current = selectedStar.position;
  }, [selectedStar]);
  const anchors = useMemo<LabelAnchor[]>(
    () => [
      ...labels.map((l, i) => ({ position: l.position, element: () => labelEls.current[i] ?? null })),
      {
        get position() {
          return selectedPosition.current;
        },
        element: () => starLabelEl.current,
      },
    ],
    [labels],
  );

  return (
    <main className="sky-root" aria-label="Stellation" data-focus={selectedStar ? "true" : "false"}>
      <h1 className="sky-sr-only">Stellation</h1>
      <SkyBackdrop />

      <div className="sky-fade" data-ready={ready}>
        {webgl && (
          <SkyScene
            sky={sky}
            reducedMotion={reducedMotion}
            anchors={anchors}
            coarsePointer={coarsePointer}
            selectedStarId={selectedStarId}
            hoveredStarId={hoveredStarId}
            onHoverStar={setHoveredStarId}
            onPickStar={pickStar}
          />
        )}
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
        {/* 원점(0x0)이 별 위치에 투영된다. 이름은 별 오른쪽 아래에 놓여 가로/세로 회절 ray와 겹치지 않는다. */}
        <div ref={starLabelEl} className="sky-star-label" aria-hidden="true">
          {selectedStar && (
            <span key={selectedStar.id} className="sky-star-label__text">
              {selectedStar.label}
            </span>
          )}
        </div>
        {!webgl && <p className="sky-note">이 환경에서는 WebGL을 사용할 수 없어 별을 표시하지 못합니다.</p>}
      </div>

      <ForestSilhouette />

      <nav className="sky-nav" aria-label="Tipo">
        <Link to="/" className="sky-nav__link">
          ← Home
        </Link>
        <Link to="/career" className="sky-nav__link">
          Career
        </Link>
      </nav>

      {selectedStar && (
        <button type="button" className="sky-back" onClick={exitFocus}>
          ← 전체 보기
        </button>
      )}

      {/* 스크린리더/키보드용: 별자리별 Knowledge Star 목록. Enter/Space로 Focus, Esc로 Universe 복귀 */}
      <p className="sky-sr-only" role="status" aria-live="polite">
        {selectedStar ? `${selectedStar.label} 별에 집중했습니다. Esc 키로 전체 보기로 돌아갑니다.` : ""}
      </p>
      <ul className="sky-sr-only">
        {sky.constellations.map((c) => (
          <li key={c.id}>
            {c.label}: {c.starIds.length}개 개념
            <ul>
              {c.starIds.map((starId) => {
                const star = sky.stars.find((s) => s.id === starId);
                if (!star) return null;
                return (
                  <li key={starId}>
                    <button
                      type="button"
                      aria-pressed={starId === selectedStarId}
                      onClick={() => pickStar(starId)}
                      onFocus={() => setHoveredStarId(starId)}
                      onBlur={() => setHoveredStarId((cur) => (cur === starId ? null : cur))}
                    >
                      {star.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  );
}
