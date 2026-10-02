// 배경 별 셰이더. Knowledge Star와 달리 "작고 날카로운 점"이 기본이다.
//  - 대부분: 가우시안 중심(core)만. sub-pixel 위치에서 샘플링되므로 별마다 밝기·선명도가 자연스럽게 달라진다.
//  - 조금 밝은 별: 날카로운 core + 아주 옅고 좁은 지수 감쇠 glow
//  - 극소수: 짧고 얇은 회절 ray
// 모든 길이는 CSS px 단위(DPR이 달라도 크기감이 같다). 큰 원형 halo는 만들지 않는다.

export const BACKDROP_VERTEX = /* glsl */ `
  attribute float aSigma;
  attribute float aBright;
  attribute float aTemp;
  attribute float aGlow;
  attribute float aGlowR;
  attribute float aSpike;
  attribute float aPhase;
  attribute float aTwinkle;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uAspect;
  uniform vec2 uParallax;
  varying float vSigma;
  varying float vBright;
  varying float vTemp;
  varying float vGlow;
  varying float vGlowR;
  varying float vSpike;
  varying float vExtent;

  void main() {
    // position.xy: 화면 높이=1인 평면 좌표 → NDC. z: 깊이(시차 배율)
    vec2 ndc = vec2(position.x * 2.0 / uAspect, position.y * 2.0) + uParallax * (0.25 + 0.75 * position.z);
    gl_Position = vec4(ndc, 0.0, 1.0);

    float tw = 1.0 + aTwinkle * (0.62 * sin(uTime * 0.7 + aPhase) + 0.38 * sin(uTime * 1.61 + aPhase * 1.7));
    vSigma = aSigma;
    vBright = aBright * tw;
    vTemp = aTemp;
    vGlow = aGlow;
    vGlowR = aGlowR;
    vSpike = aSpike;

    // 가우시안 3시그마, glow 5배 반경, ray 길이 중 필요한 만큼만 sprite를 키운다.
    float extent = max(aSigma * 3.2, 1.6);
    extent = max(extent, aGlowR * 5.0 * step(0.001, aGlow));
    extent = max(extent, aSpike);
    float size = min(ceil(extent * 2.0 * uPixelRatio) + 1.0, 64.0);
    gl_PointSize = size;
    vExtent = size * 0.5 / uPixelRatio;
  }
`;

export const BACKDROP_FRAGMENT = /* glsl */ `
  precision highp float;
  varying float vSigma;
  varying float vBright;
  varying float vTemp;
  varying float vGlow;
  varying float vGlowR;
  varying float vSpike;
  varying float vExtent;

  void main() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0 * vExtent; // 중심에서의 거리(CSS px)
    float r = length(p);

    float core = exp(-(r * r) / (2.0 * vSigma * vSigma));
    float glow = vGlow * exp(-r / max(vGlowR, 0.01));

    float rays = 0.0;
    if (vSpike > 0.001) {
      float ax = abs(p.x);
      float ay = abs(p.y);
      float w = 0.32;
      float len = vSpike * 0.3;
      rays = (exp(-(ay * ay) / (2.0 * w * w)) * exp(-ax / len) + exp(-(ax * ax) / (2.0 * w * w)) * exp(-ay / len)) * 0.2;
    }

    // sprite 가장자리에서 정확히 0 (사각형 경계가 보이면 안 된다)
    float edge = 1.0 - smoothstep(0.7, 1.0, max(abs(p.x), abs(p.y)) / vExtent);

    // 색온도: 따뜻한 흰색 ↔ 중립 ↔ 차가운 흰색. 아주 옅게만.
    vec3 warm = vec3(1.0, 0.91, 0.80);
    vec3 neutral = vec3(0.97, 0.98, 1.0);
    vec3 cool = vec3(0.82, 0.90, 1.0);
    vec3 tint = vTemp < 0.5 ? mix(warm, neutral, vTemp * 2.0) : mix(neutral, cool, (vTemp - 0.5) * 2.0);
    vec3 coreCol = mix(tint, vec3(1.0), 0.55);

    vec3 col = (coreCol * core + tint * (glow + rays)) * vBright * edge;

    // 별빛이 사실상 0인 픽셀은 아예 쓰지 않는다(블렌딩 설정과 무관하게 sprite 영역이 남지 않게).
    if (max(col.r, max(col.g, col.b)) < 0.002) discard;

    // alpha는 쓰지 않는다: 블렌딩이 RGB만 더하고 framebuffer alpha는 그대로 둔다(BackdropStars.tsx 참고).
    gl_FragColor = vec4(col, 0.0);
  }
`;
