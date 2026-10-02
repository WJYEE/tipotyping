import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AddEquation, BufferAttribute, BufferGeometry, CustomBlending, OneFactor, ShaderMaterial, Vector2, ZeroFactor } from "three";
import { generateBackdropStars } from "@/features/constellation/model/backdropStars";
import { BACKDROP_FRAGMENT, BACKDROP_VERTEX } from "@/features/constellation/scene/backdropShaders";

/**
 * 데이터와 무관한 배경 별. 하나의 Points(draw call 1회)로 그린다.
 * 위치는 화면비와 무관하게 고정이고, 화면비는 uAspect로만 반영한다(resize해도 별이 바뀌지 않는다).
 */
export function BackdropStars({ reducedMotion, parallax }: { reducedMotion: boolean; parallax: { current: { x: number; y: number } } }) {
  const geometry = useMemo(() => {
    const d = generateBackdropStars();
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(d.position, 3));
    g.setAttribute("aSigma", new BufferAttribute(d.sigma, 1));
    g.setAttribute("aBright", new BufferAttribute(d.bright, 1));
    g.setAttribute("aTemp", new BufferAttribute(d.temp, 1));
    g.setAttribute("aGlow", new BufferAttribute(d.glow, 1));
    g.setAttribute("aGlowR", new BufferAttribute(d.glowRadius, 1));
    g.setAttribute("aSpike", new BufferAttribute(d.spike, 1));
    g.setAttribute("aPhase", new BufferAttribute(d.phase, 1));
    g.setAttribute("aTwinkle", new BufferAttribute(d.twinkle, 1));
    return g;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: BACKDROP_VERTEX,
        fragmentShader: BACKDROP_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uAspect: { value: 1 },
          uParallax: { value: new Vector2() },
        },
        // 빛만 더한다: RGB는 dst + src, framebuffer alpha는 건드리지 않는다.
        // three의 AdditiveBlending은 alpha 채널에도 SRC_ALPHA를 더해, 별이 없는 sprite 영역도 alpha=1(불투명 검정)이 된다.
        // 이 Canvas는 alpha:true라 그 값이 뒤의 하늘 배경을 가려 검은 사각형으로 보인다.
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: CustomBlending,
        blendEquation: AddEquation,
        blendSrc: OneFactor,
        blendDst: OneFactor,
        blendSrcAlpha: ZeroFactor,
        blendDstAlpha: OneFactor,
      }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock, gl, size }) => {
    const u = material.uniforms;
    u.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uAspect.value = size.width / Math.max(size.height, 1);
    u.uParallax.value.set(-parallax.current.x * 0.012, -parallax.current.y * 0.012);
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={0} />;
}
