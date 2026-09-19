"use client";

import { useId } from "react";

import { photoOf } from "@/data/university-photos";
import { cn } from "@/lib/utils";

/**
 * A picture for every university, drawn rather than photographed.
 *
 * The catalogue has no photographs and this product does not use pictures it
 * cannot account for, so each university gets a sky of its own instead: a
 * night scene deterministically derived from its name. Same name, same sky,
 * every time, on every device, with nothing stored and nothing requested — the
 * name is the seed, and the seed is the whole asset.
 *
 * It is not a photograph of the campus and never pretends to be one. What it
 * is, is an image a person recognises: after two visits Imperial is the one
 * with the low ringed planet, and recognition is the entire job a photograph
 * would have done here. `data/university-photos.ts` is the door a real,
 * credited photograph walks in through later; when one exists, this component
 * steps aside for it.
 *
 * ── Why everything is rounded ──────────────────────────────────────────────
 *
 * The scene is generated during server rendering and again during hydration.
 * `Math.sin` and `Math.cos` are allowed to disagree in their last bit between
 * Node and the browser, and React, finding different attributes, throws the
 * subtree away rather than patching it. Two decimals is far more than an SVG
 * coordinate needs and far less than the fourteenth place where engines argue.
 */

/* -------------------------------------------------------------------------- */
/* Determinism                                                                 */
/* -------------------------------------------------------------------------- */

/** FNV-1a. Integer arithmetic only, so it is the same number everywhere. */
function seedOf(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: small, fast, and exactly reproducible from its seed. */
function randomFrom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fixed = (value: number): number => Math.round(value * 100) / 100;

const WIDTH = 480;
const HEIGHT = 300;
const RAD = Math.PI / 180;

/* -------------------------------------------------------------------------- */
/* The scene                                                                   */
/* -------------------------------------------------------------------------- */

interface Scene {
  stars: { x: number; y: number; r: number; o: number }[];
  sparkles: { x: number; y: number; r: number }[];
  planet: { x: number; y: number; r: number; tilt: number; ringed: boolean };
  craters: { x: number; y: number; r: number }[];
  constellation: { x: number; y: number }[];
  horizon: number;
  comet: { x: number; y: number; dx: number; dy: number };
}

/**
 * Everything drawn below, decided once from the seed.
 *
 * Kept apart from the markup deliberately: the geometry is the part that has to
 * be identical on the server and in the browser, and it is easier to keep a
 * promise like that about one pure function than about a tree of JSX.
 */
function sceneFor(seed: string): Scene {
  const random = randomFrom(seedOf(seed));
  const between = (min: number, max: number) => fixed(min + random() * (max - min));

  // The planet sits in one of four corners, big and cropped by the frame, so
  // the composition differs at a glance and not only in its details.
  //
  // Horizontally it may hang right off the edge; vertically it may not. The
  // frames this is drawn into run from 8:5 to 12:5, and the wide ones keep only
  // the middle two thirds of the height — a planet parked at y = -20 exists
  // only in the thumbnail and leaves the page-top band empty sky.
  const corner = Math.floor(random() * 4);
  const planet = {
    x: corner % 2 === 0 ? between(-30, 60) : between(WIDTH - 60, WIDTH + 30),
    y: corner < 2 ? between(25, 95) : between(HEIGHT - 95, HEIGHT - 25),
    r: between(70, 130),
    tilt: between(-28, 28),
    ringed: random() > 0.45,
  };

  const craters = Array.from({ length: 3 + Math.floor(random() * 4) }, () => {
    const angle = between(0, 360) * RAD;
    const distance = between(0.15, 0.72) * planet.r;
    return {
      x: fixed(planet.x + distance * Math.cos(angle)),
      y: fixed(planet.y + distance * Math.sin(angle)),
      r: between(planet.r * 0.06, planet.r * 0.17),
    };
  });

  // The constellation is the recognisable part: a short chain of stars, always
  // in the open half of the frame, away from the planet.
  const fromLeft = planet.x > WIDTH / 2;
  const nodes = 4 + Math.floor(random() * 3);
  const constellation = Array.from({ length: nodes }, (_unused, index) => ({
    x: fixed(
      (fromLeft ? 40 : WIDTH - 220) + (index / (nodes - 1)) * 180 + between(-26, 26),
    ),
    y: between(60, HEIGHT - 90),
  }));

  return {
    stars: Array.from({ length: 64 }, () => ({
      x: between(0, WIDTH),
      y: between(0, HEIGHT),
      r: between(0.5, 1.7),
      o: between(0.18, 0.85),
    })),
    sparkles: Array.from({ length: 3 }, () => ({
      x: between(30, WIDTH - 30),
      y: between(25, HEIGHT - 60),
      r: between(4, 9),
    })),
    planet,
    craters,
    constellation,
    horizon: between(HEIGHT - 26, HEIGHT + 24),
    comet: { x: between(60, WIDTH - 120), y: between(58, 118), dx: between(34, 72), dy: between(12, 30) },
  };
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The picture for one university.
 *
 * `seed` is what the sky is generated from — pass the university's name, not
 * its id, so the same institution looks the same wherever it is drawn.
 * `programId` is only consulted to see whether a real photograph exists.
 */
export function UniversityCrest({
  seed,
  programId,
  label,
  className,
  compact = false,
}: {
  seed: string;
  programId?: string;
  /** Drawn faintly across the sky. Usually the university's initials. */
  label?: string;
  className?: string;
  /** The square thumbnail composition instead, for anything under ~120px. */
  compact?: boolean;
}) {
  const uid = useId();
  const photo = programId === undefined ? undefined : photoOf(programId);
  const scene = sceneFor(seed);

  if (photo !== undefined) {
    return (
      // Not `next/image`: these are author-supplied files of known size sitting
      // in `public/`, and the crest they replace has no loading state either.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo.src}
        alt={photo.alt}
        loading="lazy"
        decoding="async"
        className={cn("size-full object-cover", className)}
      />
    );
  }

  if (compact) return <CrestMark scene={scene} uid={uid} className={className} />;

  const sky = `sky-${uid}`;
  const glow = `glow-${uid}`;
  const shade = `shade-${uid}`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn("size-full", className)}
      role="img"
      aria-label={label === undefined ? "Ночное небо университета" : `Небо ${label}`}
    >
      <defs>
        <radialGradient id={sky} cx="50%" cy="0%" r="120%">
          <stop offset="0%" stopColor="rgb(255 255 255 / 0.1)" />
          <stop offset="55%" stopColor="rgb(255 255 255 / 0.02)" />
          <stop offset="100%" stopColor="rgb(0 0 0 / 0)" />
        </radialGradient>
        <radialGradient id={glow} cx="34%" cy="26%" r="78%">
          <stop offset="0%" stopColor="rgb(255 255 255 / 0.9)" />
          <stop offset="58%" stopColor="rgb(255 255 255 / 0.34)" />
          <stop offset="100%" stopColor="rgb(255 255 255 / 0.07)" />
        </radialGradient>
        <linearGradient id={shade} x1="0" y1="0" x2="1" y2="0.55">
          <stop offset="0%" stopColor="rgb(0 0 0 / 0)" />
          <stop offset="62%" stopColor="rgb(0 0 0 / 0.55)" />
          <stop offset="100%" stopColor="rgb(0 0 0 / 0.86)" />
        </linearGradient>
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill="rgb(9 9 11)" />
      <rect width={WIDTH} height={HEIGHT} fill={`url(#${sky})`} />

      {scene.stars.map((star, index) => (
        <circle
          key={`star-${index}`}
          cx={star.x}
          cy={star.y}
          r={star.r}
          fill="rgb(255 255 255)"
          opacity={star.o}
        />
      ))}

      {/* Комета: одна линия и голова. Больше не нужно. */}
      <g opacity="0.55">
        <line
          x1={scene.comet.x}
          y1={scene.comet.y}
          x2={fixed(scene.comet.x + scene.comet.dx)}
          y2={fixed(scene.comet.y + scene.comet.dy)}
          stroke="rgb(255 255 255 / 0.4)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <circle
          cx={fixed(scene.comet.x + scene.comet.dx)}
          cy={fixed(scene.comet.y + scene.comet.dy)}
          r="1.8"
          fill="rgb(255 255 255)"
        />
      </g>

      {/* Созвездие — то, по чему университет узнают со второго раза. */}
      <g>
        <polyline
          points={scene.constellation.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="rgb(255 255 255 / 0.22)"
          strokeWidth="1"
        />
        {scene.constellation.map((point, index) => (
          <circle
            key={`node-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === 0 ? 2.8 : 1.9}
            fill="rgb(255 255 255)"
            opacity={index === 0 ? 0.95 : 0.7}
          />
        ))}
      </g>

      {/* Четырёхлучевые искры: космический знак, который читается и в 24px. */}
      {scene.sparkles.map((sparkle, index) => (
        <path
          key={`sparkle-${index}`}
          d={sparklePath(sparkle.x, sparkle.y, sparkle.r)}
          fill="rgb(255 255 255 / 0.5)"
        />
      ))}

      {/* Планета. Кольцо рисуется позади диска и снова поверх него, поэтому
          выглядит надетым, а не приклеенным сбоку. */}
      {scene.planet.ringed && (
        <ellipse
          cx={scene.planet.x}
          cy={scene.planet.y}
          rx={fixed(scene.planet.r * 1.55)}
          ry={fixed(scene.planet.r * 0.34)}
          fill="none"
          stroke="rgb(255 255 255 / 0.3)"
          strokeWidth="1.5"
          transform={`rotate(${scene.planet.tilt} ${scene.planet.x} ${scene.planet.y})`}
        />
      )}
      <circle cx={scene.planet.x} cy={scene.planet.y} r={scene.planet.r} fill={`url(#${glow})`} />
      {scene.craters.map((crater, index) => (
        <circle
          key={`crater-${index}`}
          cx={crater.x}
          cy={crater.y}
          r={crater.r}
          fill="rgb(0 0 0 / 0.16)"
        />
      ))}
      <circle cx={scene.planet.x} cy={scene.planet.y} r={scene.planet.r} fill={`url(#${shade})`} />
      <circle
        cx={scene.planet.x}
        cy={scene.planet.y}
        r={scene.planet.r}
        fill="none"
        stroke="rgb(255 255 255 / 0.28)"
        strokeWidth="1"
      />
      {scene.planet.ringed && (
        <path
          d={ringFrontPath(scene.planet.x, scene.planet.y, scene.planet.r)}
          fill="none"
          stroke="rgb(255 255 255 / 0.42)"
          strokeWidth="1.5"
          transform={`rotate(${scene.planet.tilt} ${scene.planet.x} ${scene.planet.y})`}
        />
      )}

      {/* Горизонт: край чужой планеты, с которого всё это видно. */}
      <path
        d={`M-40 ${HEIGHT + 60} L-40 ${scene.horizon} Q${WIDTH / 2} ${fixed(scene.horizon - 34)} ${WIDTH + 40} ${scene.horizon} L${WIDTH + 40} ${HEIGHT + 60} Z`}
        fill="rgb(0 0 0 / 0.72)"
        stroke="rgb(255 255 255 / 0.16)"
        strokeWidth="1"
      />

      {label !== undefined && (
        <text
          x={WIDTH - 20}
          y={HEIGHT - 18}
          textAnchor="end"
          fill="rgb(255 255 255 / 0.16)"
          style={{ fontSize: 56, fontWeight: 700, letterSpacing: "0.08em" }}
        >
          {label}
        </text>
      )}
    </svg>
  );
}

/**
 * The same sky at 36 pixels.
 *
 * Not the full scene scaled down — that is a grey square. A thumbnail has room
 * for exactly three things, so it keeps the three the eye actually sorts by:
 * which corner the planet is in, whether it wears a ring, and the spark. Same
 * `Scene`, so a row in a list and the picture it opens are recognisably the
 * same university rather than two different drawings of it.
 */
function CrestMark({
  scene,
  uid,
  className,
}: {
  scene: Scene;
  uid: string;
  className?: string;
}) {
  const glow = `mark-glow-${uid}`;
  const shade = `mark-shade-${uid}`;

  // Планета садится в тот же угол, что и на большой картинке, но целиком в
  // кадре: на 36px срезанный диск неотличим от засветки.
  const left = scene.planet.x < WIDTH / 2;
  const top = scene.planet.y < HEIGHT / 2;
  const cx = left ? 22 : 42;
  const cy = top ? 24 : 42;
  const r = 19;

  return (
    <svg
      viewBox="0 0 64 64"
      preserveAspectRatio="xMidYMid slice"
      className={cn("size-full", className)}
      aria-hidden
    >
      <defs>
        <radialGradient id={glow} cx="34%" cy="26%" r="78%">
          <stop offset="0%" stopColor="rgb(255 255 255 / 0.95)" />
          <stop offset="58%" stopColor="rgb(255 255 255 / 0.4)" />
          <stop offset="100%" stopColor="rgb(255 255 255 / 0.1)" />
        </radialGradient>
        <linearGradient id={shade} x1="0" y1="0" x2="1" y2="0.55">
          <stop offset="0%" stopColor="rgb(0 0 0 / 0)" />
          <stop offset="62%" stopColor="rgb(0 0 0 / 0.5)" />
          <stop offset="100%" stopColor="rgb(0 0 0 / 0.85)" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" fill="rgb(9 9 11)" />

      {scene.stars.slice(0, 9).map((star, index) => (
        <circle
          key={`mark-star-${index}`}
          cx={fixed((star.x / WIDTH) * 64)}
          cy={fixed((star.y / HEIGHT) * 64)}
          r={fixed(0.7 + star.r * 0.4)}
          fill="rgb(255 255 255)"
          opacity={fixed(0.4 + star.o * 0.5)}
        />
      ))}

      <path
        d={sparklePath(left ? 50 : 14, top ? 46 : 18, 5)}
        fill="rgb(255 255 255 / 0.75)"
      />

      {scene.planet.ringed && (
        <ellipse
          cx={cx}
          cy={cy}
          rx={fixed(r * 1.5)}
          ry={fixed(r * 0.34)}
          fill="none"
          stroke="rgb(255 255 255 / 0.45)"
          strokeWidth="1.2"
          transform={`rotate(${scene.planet.tilt} ${cx} ${cy})`}
        />
      )}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${glow})`} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${shade})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="0.8" />
    </svg>
  );
}

/** A four-pointed star: the one glyph that reads as "space" at any size. */
function sparklePath(x: number, y: number, r: number): string {
  const waist = fixed(r * 0.24);
  return [
    `M${x} ${fixed(y - r)}`,
    `Q${fixed(x + waist)} ${fixed(y - waist)} ${fixed(x + r)} ${y}`,
    `Q${fixed(x + waist)} ${fixed(y + waist)} ${x} ${fixed(y + r)}`,
    `Q${fixed(x - waist)} ${fixed(y + waist)} ${fixed(x - r)} ${y}`,
    `Q${fixed(x - waist)} ${fixed(y - waist)} ${x} ${fixed(y - r)}`,
    "Z",
  ].join("");
}

/** The near half of the ring, drawn over the disc so the planet wears it. */
function ringFrontPath(x: number, y: number, r: number): string {
  const rx = fixed(r * 1.55);
  const ry = fixed(r * 0.34);
  return `M${fixed(x - rx)} ${y} A${rx} ${ry} 0 0 0 ${fixed(x + rx)} ${y}`;
}

/** Initials for the faint lettering, from a university's name. */
export function crestInitials(name: string): string {
  const words = name
    // Скобки вместе с содержимым: «Satbayev University (КазНИТУ)» иначе даёт
    // «SUК» — три буквы из двух алфавитов, которые ничего не сокращают.
    .replace(/\([^)]*\)/g, " ")
    .replace(/[,.]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word.toLocaleLowerCase("ru")));
  const letters = words
    .slice(0, 3)
    .map((word) => word[0] ?? "")
    .join("");
  return letters.toLocaleUpperCase("ru") || name.slice(0, 2).toLocaleUpperCase("ru");
}

/**
 * Linking words only.
 *
 * Nothing that carries meaning is dropped: "Massachusetts Institute of
 * Technology" has to come out MIT, and "University College London" UCL, which
 * it cannot do if the word "university" is thrown away as boilerplate.
 */
const STOP_WORDS = new Set(["of", "the", "and", "for", "им", "имени"]);
