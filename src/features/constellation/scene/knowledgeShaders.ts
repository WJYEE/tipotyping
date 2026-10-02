// Knowledge Star 셰이더. 별 하나 = camera-facing quad 인스턴스 하나.
//   core   : 아주 작고 강한 가우시안(시그마 ~0.5~0.8px). 별이 "큰 흰 공"이 되지 않는다.
//   PSF    : Moffat 감쇠 (1 + (r/α)²)^-β. 원형 blob이 아니라 길게 부드럽게 사라지는 광학적 falloff.
//   rays   : 별마다 회전·가로세로 길이가 다른 가느다란 회절 ray(tier에 따라 없음~Anchor), Anchor에만 약한 대각선 ray.
// 모든 길이는 CSS px. 합성은 "빛만 더하기"(RGB 가산, framebuffer alpha 불변)라 quad 영역이 배경과 구분되지 않는다.

export const KNOWLEDGE_VERTEX = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec4 aShape;  // coreSigma, psfRadius, psfGain, luminosity
  attribute vec4 aRay;    // rayLengthH, rayLengthV, rayGain, rayAngle
  attribute vec4 aMisc;   // diagGain, temperature, twinkleAmp, phase
  attribute vec2 aSize;   // quad 반폭(CSS px), twinkleSpeed

  uniform vec2 uResolution; // CSS px
  uniform float uTime;

  varying vec2 vLocal;
  varying float vHalfSize;
  varying vec4 vShape;
  varying vec4 vRay;
  varying float vDiag;
  varying float vTemp;
  varying float vLum;

  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(aCenter, 1.0);
    vec2 corner = position.xy; // (-1,-1)~(1,1)
    // CSS px 오프셋 → NDC. 깊이와 무관하게 화면에서 일정한 크기를 갖는다.
    vec2 ndcOffset = corner * aSize.x * 2.0 / uResolution;
    gl_Position = clip + vec4(ndcOffset * clip.w, 0.0, 0.0);

    float tw = 1.0 + aMisc.z * (0.62 * sin(uTime * aSize.y + aMisc.w) + 0.38 * sin(uTime * aSize.y * 2.31 + aMisc.w * 1.7));
    vLocal = corner * aSize.x;
    vHalfSize = aSize.x;
    vShape = aShape;
    vRay = aRay;
    vDiag = aMisc.x;
    vTemp = aMisc.y;
    vLum = aShape.w * tw;
  }
`;

export const KNOWLEDGE_FRAGMENT = /* glsl */ `
  precision highp float;
  varying vec2 vLocal;
  varying float vHalfSize;
  varying vec4 vShape;
  varying vec4 vRay;
  varying float vDiag;
  varying float vTemp;
  varying float vLum;

  const float RAY_WIDTH = 0.36;

  // 한 갈래: t = ray 축 방향 거리, d = 축에서 떨어진 거리. 길이 L에서 정확히 0이 된다.
  float arm(float t, float d, float len) {
    if (len < 0.5) return 0.0;
    float along = exp(-t / (len * 0.26)) * (1.0 - smoothstep(0.5, 1.0, t / len)) * smoothstep(0.0, 1.5, t);
    return along * exp(-(d * d) / (2.0 * RAY_WIDTH * RAY_WIDTH));
  }

  vec2 rot(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  }

  void main() {
    vec2 p = vLocal;
    float r = length(p);
    float coreSigma = vShape.x;
    float psfRadius = vShape.y;
    float psfGain = vShape.z;

    float core = exp(-(r * r) / (2.0 * coreSigma * coreSigma));
    float q = r / psfRadius;
    float psf = psfGain * pow(1.0 + q * q, -2.6); // Moffat-like: 경계 없이 길게 감쇠

    vec2 a = rot(p, -vRay.w);
    float rays = arm(abs(a.x), abs(a.y), vRay.x) + arm(abs(a.y), abs(a.x), vRay.y);
    if (vDiag > 0.001) {
      vec2 b = rot(a, 0.785398 + 0.05);
      float dl = max(vRay.x, vRay.y) * 0.42;
      rays += vDiag * (arm(abs(b.x), abs(b.y), dl) + arm(abs(b.y), abs(b.x), dl));
    }
    rays *= vRay.z;

    // 어떤 밝기에서도 quad 경계가 보이지 않도록 가장자리에서 0으로 닫는다.
    float edge = 1.0 - smoothstep(0.78, 1.0, max(abs(p.x), abs(p.y)) / vHalfSize);

    // 미세한 색온도: 대부분 중립~살짝 차가운 흰색. 중심은 거의 흰색.
    vec3 warm = vec3(1.0, 0.93, 0.84);
    vec3 neutral = vec3(0.97, 0.98, 1.0);
    vec3 cool = vec3(0.84, 0.91, 1.0);
    vec3 tint = vTemp < 0.5 ? mix(warm, neutral, vTemp * 2.0) : mix(neutral, cool, (vTemp - 0.5) * 2.0);
    vec3 coreCol = mix(tint, vec3(1.0), 0.6);

    vec3 col = (coreCol * core + tint * (psf + rays)) * vLum * edge;
    if (max(col.r, max(col.g, col.b)) < 0.002) discard;

    // alpha는 쓰지 않는다: 블렌딩이 RGB만 더하고 framebuffer alpha는 그대로 둔다.
    gl_FragColor = vec4(col, 0.0);
  }
`;
