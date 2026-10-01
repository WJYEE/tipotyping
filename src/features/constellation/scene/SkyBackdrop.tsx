import { useEffect, useRef } from "react";
import { createRng } from "@/features/constellation/model/rng";

// 단색 검정이 아닌 "깊은 밤하늘" 배경. 작은 2D canvas에 한 번만 그려 CSS로 늘려 쓴다(비용이 거의 없다).
// 완만한 수직 그라디언트 + 아주 옅은 대각선 은하수 띠 + 넓은 성운 얼룩 + 비네팅으로 구성한다.
const W = 960;
const H = 540;
const SEED = 7102026;

export function paintSky(ctx: CanvasRenderingContext2D) {
  const rng = createRng(SEED);

  // 1) 완만한 깊이 그라디언트: 위는 거의 검정에 가까운 남색, 아래는 아주 약간 밝고 따뜻함
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, "#03050b");
  base.addColorStop(0.45, "#070b18");
  base.addColorStop(0.8, "#0c1224");
  base.addColorStop(1, "#13172a");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // 2) 넓고 아주 옅은 성운 얼룩(차가운/따뜻한 톤이 번갈아). 형태가 읽히지 않을 정도로만.
  const blobs: [number, number, number, string][] = [
    [0.22, 0.32, 0.34, "rgba(70,90,150,0.07)"],
    [0.74, 0.62, 0.38, "rgba(60,80,140,0.06)"],
    [0.5, 0.18, 0.3, "rgba(110,90,140,0.04)"],
    [0.86, 0.2, 0.26, "rgba(70,95,150,0.05)"],
    [0.12, 0.8, 0.3, "rgba(120,95,90,0.035)"],
  ];
  for (const [bx, by, br, color] of blobs) {
    const g = ctx.createRadialGradient(bx * W, by * H, 0, bx * W, by * H, br * W);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // 3) 대각선 은하수 띠: 가우시안 분포로 흩뿌린 아주 작은 점. 밀집부가 밝은 안개처럼 보인다.
  const angle = -0.42;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let i = 0; i < 9000; i++) {
    const along = (rng() - 0.5) * W * 1.5;
    const across = (rng() + rng() + rng() - 1.5) * 70; // 가운데로 몰림
    const x = W / 2 + along * cos - across * sin;
    const y = H / 2 + along * sin + across * cos;
    const warm = rng() < 0.3;
    const a = 0.012 + rng() * 0.03;
    ctx.fillStyle = warm ? `rgba(215,190,170,${a})` : `rgba(165,190,235,${a})`;
    const s = 0.5 + rng() * 1.1;
    ctx.fillRect(x, y, s, s);
  }

  // 4) 비네팅: 가장자리를 눌러 시선을 중앙의 별에 둔다
  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, W * 0.62);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

export function SkyBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    paintSky(ctx);
  }, []);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      style={{ backgroundColor: "#05070f" }}
    />
  );
}
