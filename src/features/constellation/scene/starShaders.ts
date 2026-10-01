// 별 렌더링 셰이더. 단순한 원형 sprite가 아니라 점 광원(core) + 가우시안 halo + 넓게 퍼지는 아주 옅은 tail,
// 소수의 밝은 별에만 얇은 회절 스파이크를 한 장의 point sprite 안에서 계산한다. Bloom/후처리는 쓰지 않는다.
// 반지름과 위치 오프셋은 모두 CSS px 단위로 다룬다(해상도·DPR이 달라도 별의 크기감이 같다).

const COMMON_VARYINGS = /* glsl */ `
  varying float vCore;
  varying float vHalo;
  varying float vBright;
  varying float vTemp;
  varying float vSpike;
  varying float vExtent;
`;

const COMMON_ATTRIBUTES = /* glsl */ `
  attribute float aCore;
  attribute float aHalo;
  attribute float aBright;
  attribute float aTemp;
  attribute float aPhase;
  attribute float aTwAmp;
  attribute float aTwSpeed;
  attribute float aSpike;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uMaxPoint;
`;

/** point sprite 크기/밝기를 정하는 공통 꼬리. gl_Position은 각 vertex shader가 먼저 설정한다. */
const VERTEX_TAIL = /* glsl */ `
  // 두 주파수를 섞은 아주 느린 반짝임 (진폭은 별마다 수 % 이내)
  float tw = 1.0 + aTwAmp * (0.62 * sin(uTime * aTwSpeed + aPhase) + 0.38 * sin(uTime * aTwSpeed * 2.31 + aPhase * 1.7));
  vCore = aCore;
  vHalo = aHalo;
  vBright = aBright * tw;
  vTemp = aTemp;
  vSpike = aSpike;
  float extent = aHalo * (1.0 + 1.3 * step(0.001, aSpike));
  float size = min(extent * 2.0 * uPixelRatio, uMaxPoint);
  gl_PointSize = size;
  // 최대 point size에 걸려 잘렸다면 fragment가 보는 반폭도 함께 줄인다.
  vExtent = size * 0.5 / uPixelRatio;
`;

/** 월드 좌표에 놓이는 Knowledge Star용. */
export const KNOWLEDGE_VERTEX = /* glsl */ `
  ${COMMON_ATTRIBUTES}
  ${COMMON_VARYINGS}
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    ${VERTEX_TAIL}
  }
`;

/**
 * 배경 별용. 카메라와 무관하게 화면(NDC)에 직접 놓아 어떤 화면비에서도 밀도가 일정하다.
 * position.xy = NDC 좌표, position.z = 깊이 레이어(0 먼 별 ~ 1 가까운 별). 시차는 uParallax로만 만든다.
 */
export const BACKDROP_VERTEX = /* glsl */ `
  ${COMMON_ATTRIBUTES}
  uniform vec2 uParallax;
  ${COMMON_VARYINGS}
  void main() {
    vec2 ndc = position.xy + uParallax * (0.25 + 0.75 * position.z);
    gl_Position = vec4(ndc, 0.0, 1.0);
    ${VERTEX_TAIL}
  }
`;

export const STAR_FRAGMENT = /* glsl */ `
  precision highp float;
  ${COMMON_VARYINGS}

  void main() {
    // 중심에서의 거리(CSS px)
    vec2 p = (gl_PointCoord - 0.5) * 2.0 * vExtent;
    float r = length(p);

    // 1) 작고 밝은 중심 광원
    float coreSigma = max(vCore * 0.55, 0.35);
    float core = exp(-(r * r) / (2.0 * coreSigma * coreSigma));

    // 2) 가우시안 halo + 3) 넓게 퍼지는 아주 옅은 tail
    float haloSigma = max(vHalo * 0.30, 1.0);
    float halo = exp(-(r * r) / (2.0 * haloSigma * haloSigma));
    float rt = r / max(vHalo * 0.55, 1.0);
    float tail = 1.0 / (1.0 + rt * rt);

    // 4) 소수의 밝은 별에만: 얇고 짧은 4갈래 회절 스파이크
    float spikes = 0.0;
    if (vSpike > 0.001) {
      float ax = abs(p.x);
      float ay = abs(p.y);
      float w = 0.42;
      float len = max(vExtent * 0.36, 1.0);
      float s1 = exp(-(ay * ay) / (2.0 * w * w)) * exp(-ax / len);
      float s2 = exp(-(ax * ax) / (2.0 * w * w)) * exp(-ay / len);
      spikes = (s1 + s2) * 0.34 * vSpike;
    }

    // point sprite 가장자리에서 정확히 0이 되도록 (사각형 경계가 보이면 안 된다)
    float edge = 1.0 - smoothstep(0.55, 1.0, r / vExtent);

    // 미세한 색온도: 따뜻한 쪽 ↔ 차가운 쪽, 중심은 흰색에 가깝다
    vec3 warm = vec3(1.0, 0.84, 0.66);
    vec3 cool = vec3(0.78, 0.87, 1.0);
    vec3 tint = mix(warm, cool, clamp(vTemp, 0.0, 1.0));
    vec3 coreCol = mix(tint, vec3(1.0), 0.68);

    vec3 col = coreCol * core * 1.15 + tint * (halo * 0.52 + tail * 0.085 + spikes);
    col *= vBright * edge;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** 연결선: 양 끝에서 서서히 사라지고, 별 중심에는 닿지 않는다. */
export const LINE_VERTEX = /* glsl */ `
  attribute float aT;
  attribute float aAlpha;
  varying float vT;
  varying float vAlpha;
  void main() {
    vT = aT;
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const LINE_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  varying float vT;
  varying float vAlpha;
  void main() {
    float fade = smoothstep(0.0, 0.22, vT) * smoothstep(1.0, 0.78, vT);
    gl_FragColor = vec4(uColor * vAlpha * fade, 1.0);
  }
`;
