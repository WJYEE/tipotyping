export interface SkyParams {
  milkyWay: number;
  glow: number;
  vignette: number;
  haze: number;
  seed: number;
}

export const DEFAULT_SKY_PARAMS: SkyParams = { milkyWay: 1, glow: 1, vignette: 1, haze: 1, seed: 7.31 };

/**
 * 개발 중 눈으로 조정하기 위한 URL 오버라이드. 예: /constellation-lab?milkyWay=2&glow=1.5
 * 숫자가 아니거나 범위를 벗어나면 기본값을 쓴다. production에서는 호출하지 않는다.
 */
export function parseSkyParams(search: string): SkyParams {
  const q = new URLSearchParams(search);
  const read = (key: keyof SkyParams, max: number): number => {
    const raw = q.get(key);
    if (raw === null || raw.trim() === "") return DEFAULT_SKY_PARAMS[key];
    const v = Number(raw);
    return Number.isFinite(v) && v >= 0 && v <= max ? v : DEFAULT_SKY_PARAMS[key];
  };
  return { milkyWay: read("milkyWay", 6), glow: read("glow", 6), vignette: read("vignette", 2), haze: read("haze", 6), seed: read("seed", 1000) };
}
