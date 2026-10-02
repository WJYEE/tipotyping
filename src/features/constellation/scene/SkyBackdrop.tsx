import { useEffect, useRef } from "react";
import { DEFAULT_SKY_PARAMS, parseSkyParams } from "@/features/constellation/scene/skyParams";
import { forestHorizon } from "@/features/constellation/environment/forestLayout";
import { SKY_FRAGMENT, SKY_VERTEX } from "@/features/constellation/scene/skyShader";

// WebGL을 쓸 수 없을 때의 정적 대체: 같은 톤의 아주 옅은 CSS 그라디언트.
const FALLBACK_BG =
  "radial-gradient(ellipse 85% 75% at 50% 42%, #070a14 0%, #04060d 70%, #02030a 100%), #04060d";

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** 풀스크린 삼각형 하나를 그리는 draw 함수를 만든다. 실패하면 null. */
function createSkyRenderer(canvas: HTMLCanvasElement, params: typeof DEFAULT_SKY_PARAMS) {
  const gl = (canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false }) ??
    canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, SKY_VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, SKY_FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uRes = u("uRes");
  gl.uniform1f(u("uMilkyWay"), params.milkyWay);
  gl.uniform1f(u("uGlow"), params.glow);
  gl.uniform1f(u("uVignette"), params.vignette);
  gl.uniform1f(u("uSeed"), params.seed);
  gl.uniform1f(u("uHaze"), params.haze);
  const uHorizon = u("uHorizon");

  return {
    draw() {
      // 배경은 저주파라 1 CSS px당 1 픽셀이면 충분하다(고DPI에서도 dithering이 곱게 남는다).
      const w = Math.max(1, Math.round(canvas.clientWidth));
      const h = Math.max(1, Math.round(canvas.clientHeight));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uHorizon, forestHorizon(w, h));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    },
  };
}

/**
 * GPU procedural 밤하늘. 프레임 루프 없이 mount/resize/context 복구 때만 한 번 그린다.
 * 개발 서버에서는 ?milkyWay=&glow=&vignette=&seed= 로 값을 바꿔 볼 수 있다.
 */
export function SkyBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const params = import.meta.env.DEV ? parseSkyParams(window.location.search) : DEFAULT_SKY_PARAMS;
    let renderer = createSkyRenderer(canvas, params);
    if (!renderer) {
      canvas.style.background = FALLBACK_BG;
      return;
    }

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => renderer?.draw());
    };
    schedule();

    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    const onLost = (e: Event) => {
      e.preventDefault();
      renderer = null;
    };
    // 컨텍스트가 복구되면 프로그램을 다시 만들어 한 번 더 그린다.
    const onRestored = () => {
      renderer = createSkyRenderer(canvas, params);
      if (renderer) schedule();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      renderer?.dispose();
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" style={{ backgroundColor: "#04060d" }} />;
}
