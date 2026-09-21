"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture, Environment } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";

/* ============================================================================
   Integrated from the supplied source. Four deviations, all forced by this
   repo's settings, none of them behavioural:

   1. `shader: any` in onBeforeCompile is typed as
      THREE.WebGLProgramParametersWithUniforms. The project runs `strict: true`
      and forbids implicit any.
   2. The particle buffers were built by a module-level IIFE, so importing this
      file allocated ~1.7 MB of Float32Arrays and ran 60 000 Math.random calls
      before anything rendered. Wrapped in a lazy getter: identical data, built
      on first render instead of on import.
   3. bufferAttribute kept only the `args` form. Passing `args` together with
      `count`/`array` is the deprecated dual API and errors under @react-three
      /fiber v9.
   4. `React.MutableRefObject` replaced with `React.RefObject`, which is the
      mutable ref type in the React 19 typings this project uses.

   Note: the moon texture is served from `public/` rather than a third-party
   CDN. It used to be a `cdn.21st.dev` URL, which the CDN only answers for
   `localhost`: from any other origin — 127.0.0.1, a phone on the same network,
   a deployed host — the texture failed CORS, the hero threw, and the landing
   collapsed to a blank 900px page with no moon and nothing to scroll. The
   `Environment preset="city"` HDRIs still load from drei's CDN at runtime.
   ========================================================================== */

const RADIUS = 2.0;

const MOON_TEXTURE = "/landing/moon-texture.jpg";

const RealisticMoon = ({
  onClick,
  interactive = true,
  animate = true,
}: {
  onClick?: () => void;
  interactive?: boolean;
  animate?: boolean;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const colorMap = useTexture(MOON_TEXTURE);

  useFrame((_, delta) => {
    if (animate && meshRef.current) meshRef.current.rotation.y += delta * 0.05;
  });

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      onClick={interactive ? onClick : undefined}
      onPointerOver={interactive ? () => (document.body.style.cursor = "pointer") : undefined}
      onPointerOut={interactive ? () => (document.body.style.cursor = "auto") : undefined}
    >
      <sphereGeometry args={[RADIUS, 64, 64]} />
      <meshStandardMaterial
        map={colorMap}
        bumpMap={colorMap}
        bumpScale={0.02}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
};

const particlesCount = 60000;

type RingBuffers = readonly [Float32Array, Float32Array, Float32Array];

function buildRingBuffers(): RingBuffers {
  const pos = new Float32Array(particlesCount * 3);
  const col = new Float32Array(particlesCount * 3);
  const rnd = new Float32Array(particlesCount);

  for (let i = 0; i < particlesCount; i++) {
    const angle = Math.random() * Math.PI * 2;

    const rDist = Math.pow(Math.random(), 1.5);
    const radius = 2.2 + rDist * 2.2;

    const thickness = 0.4 - rDist * 0.2;
    const ySpread = Math.random() + Math.random() + Math.random() - 1.5;
    const y = ySpread * thickness;

    pos[i * 3] = Math.cos(angle) * radius;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = Math.sin(angle) * radius;

    // Floored rather than fading to nothing: at `1 - rDist` the outer two
    // thirds of the ring sank into the sky and the whole thing read as haze.
    const intensity = 0.38 + 0.62 * (1.0 - rDist);

    const paletteType = Math.random();
    let baseR: number;
    let baseG: number;
    let baseB: number;

    // The dominant tone was a 0.25 grey, which against a black sky is almost
    // nothing. Lifted to a pale ice, with the two accents pushed up to match.
    if (paletteType < 0.78) {
      baseR = 0.62;
      baseG = 0.67;
      baseB = 0.76;
    } else if (paletteType < 0.91) {
      baseR = 0.25;
      baseG = 0.78;
      baseB = 1.0;
    } else {
      baseR = 0.76;
      baseG = 0.38;
      baseB = 1.0;
    }

    baseR = Math.min(1.0, Math.max(0.0, baseR + (Math.random() - 0.5) * 0.1));
    baseG = Math.min(1.0, Math.max(0.0, baseG + (Math.random() - 0.5) * 0.1));
    baseB = Math.min(1.0, Math.max(0.0, baseB + (Math.random() - 0.5) * 0.1));

    const sparkle = Math.random() > 0.9 ? 2.8 : 1.0;

    col[i * 3] = baseR * intensity * sparkle;
    col[i * 3 + 1] = baseG * intensity * sparkle;
    col[i * 3 + 2] = baseB * intensity * sparkle;
    rnd[i] = Math.random();
  }
  return [pos, col, rnd] as const;
}

/**
 * Catches a failed `<Environment>` HDRI fetch instead of letting it blank the
 * page.
 *
 * `useEnvironment` loads its HDRI from `raw.githack.com` (drei's asset CDN)
 * and throws when that fetch fails — an ad blocker, a corporate proxy, or the
 * CDN itself having a bad day are all real, and none of them are anything
 * this component can prevent. `<Suspense fallback={null}>` around
 * `<Environment>` only covers the loading state; a thrown error still
 * propagates past it to the nearest boundary, and with none in the tree
 * before this fix, React unmounted everything back to the app root — a moon
 * on the landing page turned into a blank page, and reused on the sign-in
 * screen it would have turned into a blank sign-in screen. The scene already
 * carries its own ambient and directional lights, so losing just the HDRI
 * reflections here is a real degrade, not a placeholder for a missing one.
 */
class EnvironmentBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

let ringBuffers: RingBuffers | null = null;

/** Built once, on first render rather than on import. */
function getRingBuffers(): RingBuffers {
  ringBuffers ??= buildRingBuffers();
  return ringBuffers;
}

type RingState = "hidden" | "animating" | "visible";

const ParticleRing = ({
  ringState,
  massiveAsteroidsRef,
  animate = true,
  progressRef,
}: {
  ringState: RingState;
  massiveAsteroidsRef: React.RefObject<Float32Array>;
  animate?: boolean;
  /** 0..1 driven from outside, e.g. by scroll. Overrides the internal timer. */
  progressRef?: React.RefObject<number>;
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const [ringPositions, ringColors, ringRandoms] = useMemo(() => getRingBuffers(), []);

  const uniforms = useRef({
    uProgress: { value: ringState === "visible" ? 1.0 : 0.0 },
    uAsteroids: { value: new Float32Array(75 * 4) },
    time: { value: 0 },
  });

  useFrame((state, delta) => {
    // Under reduced motion the geometry is still built and still displaced by
    // the asteroids, it simply does not advance in time.
    const step = animate ? delta : 0;

    if (pointsRef.current) {
      pointsRef.current.rotation.y -= step * 0.02;
      pointsRef.current.updateMatrix();

      const invMat = new THREE.Matrix4().copy(pointsRef.current.matrix).invert();
      const localAsteroids = new Float32Array(75 * 4);
      const source = massiveAsteroidsRef.current;
      for (let i = 0; i < 75; i++) {
        const ast = new THREE.Vector3(
          source[i * 4] ?? 0,
          source[i * 4 + 1] ?? 0,
          source[i * 4 + 2] ?? 0,
        );
        ast.applyMatrix4(invMat);
        localAsteroids[i * 4] = ast.x;
        localAsteroids[i * 4 + 1] = ast.y;
        localAsteroids[i * 4 + 2] = ast.z;
        localAsteroids[i * 4 + 3] = source[i * 4 + 3] ?? 0;
      }
      uniforms.current.uAsteroids.value = localAsteroids;
    }
    if (animate) uniforms.current.time.value = state.clock.elapsedTime;

    if (progressRef) {
      // Chase the target instead of snapping to it: a fast scroll flick would
      // otherwise pop the whole ring into existence in one frame.
      const target = Math.max(0, Math.min(1, progressRef.current));
      const current = uniforms.current.uProgress.value;
      uniforms.current.uProgress.value = animate
        ? current + (target - current) * Math.min(1, delta * 7)
        : target;
    } else if (!animate) {
      uniforms.current.uProgress.value = ringState === "hidden" ? 0.0 : 1.0;
    } else if (ringState === "animating") {
      uniforms.current.uProgress.value += delta * 0.35;
      if (uniforms.current.uProgress.value > 1.0) uniforms.current.uProgress.value = 1.0;
    } else if (ringState === "visible") {
      uniforms.current.uProgress.value = 1.0;
    } else {
      uniforms.current.uProgress.value = 0.0;
    }
  });

  const onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uProgress = uniforms.current.uProgress;
    shader.uniforms.uAsteroids = uniforms.current.uAsteroids;
    shader.uniforms.time = uniforms.current.time;

    shader.vertexShader = `
      uniform float uProgress;
      uniform vec4 uAsteroids[75];
      uniform float time;
      attribute float aRandom;
      varying float vProgress;
      ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
      `#include <begin_vertex>`,
      `
      vec3 transformed = vec3(position);

      float angle = atan(transformed.x, transformed.z);
      float normalizedAngle = abs(angle) / 3.14159265359;
      float spawnThreshold = 1.0 - normalizedAngle;

      float progressValue = (uProgress * 1.4) - spawnThreshold;
      float particleProgress = smoothstep(0.0, 0.4, progressValue);
      vProgress = particleProgress;

      transformed.y += sin(angle * 10.0 + time) * 0.05 * aRandom;

      if (uProgress > 0.5) {
        for(int i = 0; i < 75; i++) {
          vec4 astData = uAsteroids[i];
          vec3 delta = transformed - astData.xyz;
          float dist = length(delta);

          float rad = astData.w * 2.0 + 0.15;

          if (dist < rad) {
             float force = pow((rad - dist) / rad, 2.0);
             transformed += normalize(delta) * force * 0.4;
             transformed.y += force * 0.20 * (aRandom - 0.5);
          }
        }
      }

      float swirl = (1.0 - particleProgress) * 4.0;
      float s = sin(swirl);
      float c = cos(swirl);
      transformed.xz = mat2(c, -s, s, c) * transformed.xz;

      transformed.y += (1.0 - particleProgress) * (transformed.y >= 0.0 ? 1.0 : -1.0);

      vec3 moonSurface = normalize(transformed) * 2.1;
      transformed = mix(moonSurface, transformed, particleProgress);
      `,
    );

    shader.fragmentShader = `
      varying float vProgress;
      ${shader.fragmentShader}
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <color_fragment>`,
      `
      #include <color_fragment>

      diffuseColor.a *= vProgress;
      `,
    );
  };

  return (
    <points ref={pointsRef} rotation={[-Math.PI / 2, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[ringPositions, 3]} />
        <bufferAttribute attach="attributes-color" args={[ringColors, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[ringRandoms, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.013}
        vertexColors
        transparent
        opacity={0.95}
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        onBeforeCompile={onBeforeCompile}
      />
    </points>
  );
};

interface Asteroid {
  angle: number;
  baseRadius: number;
  radialAmplitude: number;
  radialSpeed: number;
  phase: number;
  zOffset: number;
  speed: number;
  rx: number;
  ry: number;
  rz: number;
  rsx: number;
  rsy: number;
  rsz: number;
  scale: number;
}

const generateAsteroids = (count: number): Asteroid[] => {
  const data: Asteroid[] = [];
  for (let i = 0; i < count; i++) {
    const baseRadius = 2.8 + Math.random() * 2.0;
    const radialAmplitude = 0.5 + Math.random() * 1.5;
    const radialSpeed = 0.15 + Math.random() * 0.25;
    const phase = Math.random() * Math.PI * 2;

    const angle = Math.random() * Math.PI * 2;
    const zOffset = (Math.random() - 0.5) * 0.8;

    const speed = (0.04 + Math.random() * 0.08) * (Math.random() > 0.5 ? 1 : -1);

    const rotationSpeedX = (Math.random() - 0.5) * 0.05;
    const rotationSpeedY = (Math.random() - 0.5) * 0.05;
    const rotationSpeedZ = (Math.random() - 0.5) * 0.05;

    const scale = 0.02 + Math.pow(Math.random(), 4) * 0.18;

    data.push({
      angle,
      baseRadius,
      radialAmplitude,
      radialSpeed,
      phase,
      zOffset,
      speed,
      rx: Math.random() * Math.PI,
      ry: Math.random() * Math.PI,
      rz: Math.random() * Math.PI,
      rsx: rotationSpeedX,
      rsy: rotationSpeedY,
      rsz: rotationSpeedZ,
      scale,
    });
  }
  data.sort((a, b) => b.scale - a.scale);
  return data;
};

const AsteroidBelt = ({
  ringState,
  massiveAsteroidsRef,
  animate = true,
  progressRef,
}: {
  ringState: RingState;
  massiveAsteroidsRef: React.RefObject<Float32Array>;
  animate?: boolean;
  progressRef?: React.RefObject<number>;
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const [colorMap, bumpMap] = useTexture([MOON_TEXTURE, MOON_TEXTURE]);

  const count = 75;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const [asteroids] = useState(() => generateAsteroids(count));

  const scaleRef = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const step = animate ? delta : 0;
    const targetScale = progressRef
      ? Math.max(0, Math.min(1, progressRef.current))
      : ringState === "hidden"
        ? 0
        : 1;
    const lerpSpeed = ringState === "hidden" ? 5 : 2;
    scaleRef.current = animate
      ? THREE.MathUtils.lerp(scaleRef.current, targetScale, delta * lerpSpeed)
      : targetScale;

    if (scaleRef.current < 0.01) {
      meshRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;

    asteroids.forEach((ast, i) => {
      ast.angle += ast.speed * step;

      ast.phase += ast.radialSpeed * step;
      let currentRadius = ast.baseRadius + Math.sin(ast.phase) * ast.radialAmplitude;

      if (currentRadius < 2.15) {
        const penetration = 2.15 - currentRadius;
        currentRadius = 2.15 + penetration * 0.85;
      }

      const x = Math.cos(ast.angle) * currentRadius;
      const y = Math.sin(ast.angle) * currentRadius;

      massiveAsteroidsRef.current[i * 4] = x;
      massiveAsteroidsRef.current[i * 4 + 1] = y;
      massiveAsteroidsRef.current[i * 4 + 2] = ast.zOffset;
      massiveAsteroidsRef.current[i * 4 + 3] = ast.scale;

      if (animate) {
        ast.rx += ast.rsx;
        ast.ry += ast.rsy;
        ast.rz += ast.rsz;
      }

      dummy.position.set(x, y, ast.zOffset);
      dummy.rotation.set(ast.rx, ast.ry, ast.rz);
      dummy.scale.setScalar(ast.scale * scaleRef.current);
      dummy.updateMatrix();

      meshRef.current?.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.08}
        color="#ffffff"
        roughness={0.7}
        metalness={0.1}
      />
    </instancedMesh>
  );
};

/**
 * Pulls the lens in as scroll advances.
 *
 * Field of view rather than camera position: moving the camera would fight
 * OrbitControls, which owns the orbit distance, and scaling the canvas from CSS
 * would force a WebGL surface to re-rasterise on every frame. Changing `fov`
 * touches neither.
 */
function CameraZoom({
  zoomRef,
  from,
  to,
}: {
  zoomRef: React.RefObject<number>;
  from: number;
  to: number;
}) {
  useFrame(({ camera }) => {
    const t = Math.max(0, Math.min(1, zoomRef.current));
    const target = from + (to - from) * t;
    const perspective = camera as THREE.PerspectiveCamera;
    if (Math.abs(perspective.fov - target) < 0.01) return;
    perspective.fov = target;
    perspective.updateProjectionMatrix();
  });
  return null;
}

/* -------------------------------------------------------------------------- */
/* Reusable scene                                                              */
/* -------------------------------------------------------------------------- */

export interface LunarSceneProps {
  /** Allow orbit dragging and the click-to-reveal gesture. */
  interactive?: boolean;
  /** Start the ring reveal on mount instead of waiting for a click. */
  autoReveal?: boolean;
  /** Pull the camera in to make the moon fill more of the frame. */
  cameraPosition?: [number, number, number];
  /** Field of view. Lower reads as a longer lens and a bigger moon. */
  fov?: number;
  /**
   * 0..1 from outside, typically scroll progress. When given, it drives the
   * ring reveal and the asteroid belt directly, replacing both the click
   * gesture and the looping timeline.
   */
  progressRef?: React.RefObject<number>;
  /**
   * 0..1 that pulls the lens in. Kept separate from `progressRef` so the reveal
   * and the zoom can run on different stretches of the same scroll.
   */
  zoomRef?: React.RefObject<number>;
  /** Field of view at `zoomRef` = 1. Lower means the moon fills more frame. */
  fovTo?: number;
  /**
   * Advance the scene over time. False freezes rotation, the orbits and the
   * reveal, which is what `prefers-reduced-motion` should get: a still moon,
   * not an empty black box.
   */
  animate?: boolean;
  className?: string;
}

/**
 * The 3D scene on its own, without the card chrome.
 *
 * Extracted so a layout that is not a 1000px card, such as the full-bleed
 * landing hero, can own its own composition instead of fighting the card's
 * fixed width, radius and text columns. The card below renders this same scene,
 * so the two can never drift apart.
 */
export function LunarScene({
  interactive = true,
  autoReveal = false,
  cameraPosition = [0, 4, 10],
  fov = 45,
  animate = true,
  progressRef,
  zoomRef,
  fovTo,
  className,
}: LunarSceneProps) {
  // Seeded rather than set from an effect: the reveal has to start on the very
  // first frame, and the project forbids setState inside an effect body.
  const [ringState, setRingState] = useState<RingState>(autoReveal ? "animating" : "hidden");
  const massiveAsteroidsRef = useRef<Float32Array>(new Float32Array(75 * 4));
  const hostRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);

  /**
   * WebGL keeps drawing at 60fps whether or not anyone can see it. Off screen
   * that is a whole core spent competing with the scroll-linked transforms
   * running further down the page, which is what made scrolling judder.
   */
  useEffect(() => {
    const node = hostRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => setOnScreen(entries.some((entry) => entry.isIntersecting)),
      // Generous margin so the loop starts and stops well away from the
      // handover: toggling it mid-transition put a hitch exactly where the
      // next screen was arriving.
      { rootMargin: "500px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className={cn("absolute inset-0 h-full w-full", className)}>
      <Canvas
        shadows
        camera={{ position: cameraPosition, fov }}
        dpr={[1, 2]}
        frameloop={onScreen ? "always" : "never"}
      >
        {/* Two separate boundaries on purpose.

            The source had one <Environment> here with no boundary at all and a
            second one inside the group. The unguarded one suspends on a 1.5 MB
            HDRI, and a suspension with no boundary inside the Canvas escapes to
            whatever boundary sits above the whole hero, which is how the moon
            ended up never appearing. Splitting them also means the moon shows
            as soon as its own 238 KB texture lands, instead of waiting on
            lighting it can live without. */}
        <EnvironmentBoundary>
          <Suspense fallback={null}>
            <Environment preset="city" />
          </Suspense>
        </EnvironmentBoundary>

        {zoomRef && fovTo !== undefined && (
          <CameraZoom zoomRef={zoomRef} from={fov} to={fovTo} />
        )}

        <ambientLight intensity={0.06} />
        <directionalLight
          position={[8, 5, 5]}
          intensity={1.5}
          color="#ffffff"
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-5, -3, -5]} intensity={0.15} color="#4a90e2" />

        <OrbitControls
          enabled={interactive}
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
        />

        <group rotation={[Math.PI / 8, 0, 0]}>
          <Suspense fallback={null}>
            <RealisticMoon
              interactive={interactive && !progressRef}
              animate={animate}
              onClick={() => {
                if (!progressRef && ringState === "hidden") setRingState("animating");
              }}
            />
            <ParticleRing
              ringState={ringState}
              massiveAsteroidsRef={massiveAsteroidsRef}
              animate={animate}
              progressRef={progressRef}
            />
            <AsteroidBelt
              ringState={ringState}
              massiveAsteroidsRef={massiveAsteroidsRef}
              animate={animate}
              progressRef={progressRef}
            />
          </Suspense>
        </group>
      </Canvas>
    </div>
  );
}

export interface LunarGravityCardProps {
  className?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /**
   * Play the ring reveal on mount instead of waiting for a click. Needed where
   * the canvas is not interactive, so the effect is still seen.
   */
  autoReveal?: boolean;
  /**
   * Allow orbit dragging and the click-to-reveal gesture. Turn this off on
   * touch layouts: OrbitControls sets `touch-action: none` on the canvas, so an
   * interactive canvas 450px tall swallows vertical page scroll.
   */
  interactive?: boolean;
}

export default function LunarGravityCard({
  className,
  title = (
    <>
      <span className="text-zinc-50 drop-shadow-sm">Lunar</span>
      <br />
      <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-400 to-zinc-800 drop-shadow-md">
        Gravity.
      </span>
    </>
  ),
  description = "Embed highly realistic astrophysics directly into your Next.js project. Zero configuration, fully interactive, and flawlessly smooth.",
  autoReveal = false,
  interactive = true,
}: LunarGravityCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[1000px] min-h-[700px] md:min-h-[auto] md:h-[540px] bg-black rounded-[2.5rem] flex flex-col md:flex-row relative overflow-hidden border border-white/[0.08] shadow-[0_30px_100px_rgba(0,0,0,0.4)]",
        className,
      )}
    >
      <div className="absolute top-0 left-0 md:inset-y-0 md:left-0 w-full h-[60%] md:h-full md:w-[60%] bg-gradient-to-b md:bg-gradient-to-r from-black via-black/90 to-transparent z-10 pointer-events-none"></div>

      <div className="w-full md:w-[45%] flex flex-col justify-center px-10 py-12 md:p-0 md:pl-16 relative z-20 pointer-events-none">
        <h2 className="text-[4.5rem] md:text-[5.5rem] font-bold tracking-tighter leading-[0.9] mb-6">
          {title}
        </h2>
        <p className="text-base md:text-lg text-zinc-400 font-medium leading-relaxed max-w-[340px]">
          {description}
        </p>
      </div>

      <div className="relative md:absolute md:right-0 md:top-0 w-full h-[450px] md:h-full md:w-[65%] pointer-events-auto z-0 flex items-center justify-center">
        <LunarScene interactive={interactive} autoReveal={autoReveal} />
      </div>
    </div>
  );
}

export { LunarGravityCard as Component };
