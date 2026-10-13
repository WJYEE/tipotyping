// 연결선 셰이더. (별 셰이더는 BackdropStars는 backdropShaders.ts, KnowledgeStars는 knowledgeShaders.ts)

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
