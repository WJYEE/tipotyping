// Sky Layer 셰이더. 정적 배경이므로 resize 때만 한 번 그린다(프레임 루프 없음).
// 구성: Deep Navy 베이스 → 하단 atmospheric lift → 넓은 저대비 Milky Way(FBM + dust attenuation) → 비네팅 → 삼각 dithering.
// 색은 sRGB 값을 그대로 출력한다(flat). 모든 가산량은 8bit 기준 수 단계 이내라서 "있는 듯 없는 듯" 해야 한다.

export const SKY_VERTEX = /* glsl */ `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const SKY_FRAGMENT = /* glsl */ `
precision highp float;

uniform vec2 uRes;
uniform float uMilkyWay; // Milky Way 강도 배율
uniform float uGlow;     // 하단 atmospheric lift 배율
uniform float uVignette; // 가장자리 어두움 배율
uniform float uHaze;     // 숲 위 atmospheric haze 배율
uniform float uHorizon;  // 숲 윗선 높이(화면 높이 대비 0~1)
uniform float uSeed;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // quintic: 격자 방향성이 덜 보인다
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 낮은 주파수 4옥타브. 옥타브마다 회전해 축 정렬 무늬를 없앤다.
float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    sum += amp * vnoise(p);
    p = rot * p * 2.03 + 17.0;
    amp *= 0.5;
  }
  return sum / 0.9375;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;                    // y=0이 아래
  float aspect = uRes.x / uRes.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);  // 높이 기준 단위, 중심 0
  vec2 s = vec2(uSeed, uSeed * 0.37);

  // 1) Deep Navy 베이스: 위는 거의 검정, 중앙은 아주 약간 푸른 남색(대비는 약하게).
  vec3 topCol = vec3(0.010, 0.015, 0.034);
  vec3 midCol = vec3(0.021, 0.030, 0.060);
  float t = smoothstep(0.0, 1.0, uv.y);
  vec3 col = mix(midCol, topCol, pow(t, 1.35));

  // 2) 하단 atmospheric lift: 지평선이 아니라 black level만 살짝 올린다.
  //    (1-y)^2.4 로 서서히 번지고, 가로 방향 저주파 변화로 균일한 띠가 되지 않게 한다.
  float low = pow(clamp(1.0 - uv.y, 0.0, 1.0), 2.4);
  float lowVar = 0.72 + 0.56 * fbm(vec2(p.x * 1.1 + 3.0, 1.7) + s);
  col += vec3(0.0085, 0.0112, 0.0195) * low * lowVar * uGlow;

  // 2b) 숲 위 atmospheric haze: 지평선이 아니라 나무 윗선 바로 위의 공기감. 숲과 하늘이 한 덩어리로 붙지 않게 하는 정도.
  //     uHorizon = 숲 윗선(화면 높이 대비). 위로 갈수록 빠르게 사라지고 가로 방향으로 불규칙하게 옅어진다.
  float above = max(uv.y - uHorizon, 0.0);
  float hazeProfile = exp(-pow(above / 0.09, 2.0));
  float hazeVar = 0.7 + 0.6 * fbm(vec2(p.x * 1.3 + 30.0, 6.0) + s);
  col += vec3(0.0050, 0.0068, 0.0120) * hazeProfile * hazeVar * uHaze;

  // 3) Milky Way: 뒤쪽 깊은 곳에 흐르는 아주 희미한 구조. 밝은 띠가 아니라 구조·밀도·먼지로 존재감을 만든다.
  //    (이 구조는 model/skyDensity.ts에 그대로 옮겨져 배경 별 밀도와 연결된다. 두 곳을 함께 수정할 것.)
  float ang = -0.52;
  mat2 r = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 q = r * p;
  // 도메인 워프: 띠가 곧은 직선이 되지 않게 한다.
  vec2 wv = vec2(fbm(q * 0.8 + s + 7.0), fbm(q * 0.8 + s + 19.0)) - 0.5;
  vec2 qw = q + wv * 0.30;
  float bend = (fbm(vec2(qw.x * 0.9 + 5.0, 2.3) + s) - 0.5) * 0.5;
  float d = qw.y - bend;
  // 폭이 띠를 따라 달라지고, 한쪽(아래)이 더 넓다: 비대칭.
  float widthMod = 0.26 + 0.14 * fbm(vec2(qw.x * 0.7 + 2.0, 5.5) + s);
  float side = mix(1.28, 1.0, smoothstep(-0.05, 0.05, d));
  float wd = widthMod * side;
  float band = exp(-pow(d / wd, 2.0));
  float haze = exp(-pow(d / (wd * 2.0), 2.0));              // 아주 넓고 옅은 haze
  // 부분적으로 흐려졌다가 다시 나타난다.
  float along = 0.22 + 0.78 * smoothstep(0.25, 0.75, fbm(vec2(qw.x * 0.8 - 4.0, 8.1) + s));
  float cloud = 0.25 + 1.35 * fbm(qw * 2.4 + s * 1.3);       // 구름 같은 내부 구조(대비는 구조로)
  // 먼지: 중심선 근처의 가늘고 끊기는 어두운 lane + 불규칙한 먼지 덩어리
  float laneC = 0.04 + (fbm(vec2(qw.x * 1.6 + 9.0, 3.3) + s) - 0.5) * 0.12;
  float lane = exp(-pow((d - laneC) / 0.055, 2.0)) * smoothstep(0.35, 0.7, fbm(vec2(qw.x * 2.2 + 1.0, qw.y * 3.0) + s));
  float dust = smoothstep(0.52, 0.78, fbm(qw * vec2(3.6, 5.2) + 11.0 + s));
  float body = max(0.0, band * along * cloud * (1.0 - 0.6 * dust * band - 0.85 * lane));
  float mw = body + 0.22 * haze * along;
  // 색: 중립 blue-gray. 아주 일부 영역에만 warm-gray.
  vec3 coolTint = vec3(0.70, 0.76, 0.88);
  vec3 warmTint = vec3(0.86, 0.82, 0.76);
  float warmMask = smoothstep(0.62, 0.8, fbm(qw * 1.2 + s + 31.0)) * 0.6;
  vec3 mwCol = mix(coolTint, warmTint, warmMask);
  col += mwCol * mw * 0.034 * uMilkyWay;

  // 4) 비네팅: 중앙에서 가장자리로 완만하게. 시선을 중앙에 둔다.
  // 넓고 완만하게(0.25~1.2), 최대 약 20%: 중앙 spotlight가 아니라 가장자리가 미세하게 깊어지는 정도.
  float vr = length(p * vec2(0.9, 1.0));
  float vig = smoothstep(0.25, 1.2, vr);
  col *= 1.0 - 0.20 * vig * vig * uVignette;

  // 5) 삼각분포 dithering(±1 LSB): 어두운 영역 banding 방지. 눈에 보이는 grain은 만들지 않는다.
  float n = hash12(frag) + hash12(frag + vec2(37.0, 17.0)) - 1.0;
  col += n / 255.0;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
