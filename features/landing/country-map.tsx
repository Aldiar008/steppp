"use client";

import { useMemo, useState } from "react";

import { COUNTRY_GEO, type GeoPoint } from "@/data/geo.generated";

/**
 * One country's real coastline with a pin on every campus the catalogue has
 * there — the picture `data/geo.generated.ts` describes and this component
 * only lays out and draws.
 *
 * Real geography over the polar chart this replaced: a country a family is
 * actually deciding between reads as that country, not as an angle and a
 * radius from Almaty. The trade a real map makes is that campuses in the same
 * city sit on top of each other — eleven of Kazakhstan's twenty universities
 * are within a few pixels of each other in Almaty — so points closer than
 * `CLUSTER_PX` are grouped and fanned out around their true location instead
 * of drawn stacked and unreadable.
 *
 * Logos are each university's real favicon, fetched live from its own
 * primary domain (`data/raw/university-coordinates.json`). A domain that
 * doesn't serve one — or that this sandbox's own network policy can't reach
 * while developing — falls back to a plain initials badge rather than a
 * broken image; nothing here is drawn from a guessed or invented mark.
 */

const CLUSTER_PX = 46;

interface Cluster {
  x: number;
  y: number;
  members: readonly GeoPoint[];
}

function clusterPoints(points: readonly GeoPoint[]): Cluster[] {
  const clusters: Cluster[] = points.map((p) => ({ x: p.x, y: p.y, members: [p] }));

  for (;;) {
    let bestI = -1;
    let bestJ = -1;
    let bestDist = CLUSTER_PX;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const dist = Math.hypot(clusters[i]!.x - clusters[j]!.x, clusters[i]!.y - clusters[j]!.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestI = i;
          bestJ = j;
        }
      }
    }

    if (bestI === -1) return clusters;

    const a = clusters[bestI]!;
    const b = clusters[bestJ]!;
    const members = [...a.members, ...b.members];
    const x = members.reduce((sum, m) => sum + m.x, 0) / members.length;
    const y = members.reduce((sum, m) => sum + m.y, 0) / members.length;
    clusters.splice(bestJ, 1);
    clusters[bestI] = { x, y, members };
  }
}

/** Fan radius grows with cluster size so logos stay legible instead of overlapping. */
function fanRadius(count: number): number {
  return 30 + Math.min(count, 12) * 6.5;
}

/** Badge radius shrinks a little in a crowded cluster. */
function badgeRadius(count: number): number {
  return Math.max(9, 15 - Math.max(0, count - 3) * 0.6);
}

const SKIP_WORDS = new Set(["of", "the", "and", "für", "de", "di", "im", "am", "им"]);

/** Last-resort mark when a favicon fails to load: not invented, just initials. */
function initials(name: string): string {
  const words = name
    .replace(/[()]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !SKIP_WORDS.has(w.toLowerCase()));
  const letters = words.slice(0, 2).map((w) => w[0]!.toUpperCase());
  return letters.join("") || name.slice(0, 2).toUpperCase();
}

function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`;
}

function clampAxis(value: number, radius: number, max: number): number {
  return Math.min(max - radius - 2, Math.max(radius + 2, value));
}

export function CountryMap({ code, name }: { code: string; name: string }) {
  const geo = COUNTRY_GEO[code];
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());

  const clusters = useMemo(() => (geo ? clusterPoints(geo.points) : []), [geo]);

  if (!geo) return null;

  const markFailed = (id: string) => setFailed((prev) => new Set(prev).add(id));

  return (
    <svg
      viewBox={`0 0 ${geo.width} ${geo.height}`}
      className="w-full"
      role="img"
      aria-label={`${geo.points.length} университетов каталога на карте — ${name}`}
    >
      <path d={geo.path} fill="rgb(255 255 255 / 0.05)" stroke="rgb(255 255 255 / 0.22)" strokeWidth={1.2} />

      {clusters.map((cluster) => {
        const isGroup = cluster.members.length > 1;
        const r = badgeRadius(cluster.members.length);
        const positions = isGroup
          ? cluster.members.map((member, i) => {
              const angle = (i / cluster.members.length) * Math.PI * 2 - Math.PI / 2;
              const radius = fanRadius(cluster.members.length);
              return {
                member,
                x: clampAxis(cluster.x + radius * Math.cos(angle), r, geo.width),
                y: clampAxis(cluster.y + radius * Math.sin(angle), r, geo.height),
              };
            })
          : [{ member: cluster.members[0]!, x: cluster.x, y: cluster.y }];

        return (
          <g key={cluster.members[0]!.id}>
            {isGroup && <circle cx={cluster.x} cy={cluster.y} r={3} fill="rgb(255 255 255 / 0.75)" />}
            {isGroup &&
              positions.map(({ member, x, y }) => (
                <line
                  key={member.id}
                  x1={cluster.x}
                  y1={cluster.y}
                  x2={x}
                  y2={y}
                  stroke="rgb(255 255 255 / 0.22)"
                  strokeWidth={1}
                />
              ))}

            {positions.map(({ member, x, y }) => {
              const clipId = `map-clip-${member.id}`;
              return (
                <g key={member.id}>
                  <title>{member.name}</title>
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill="rgb(255 255 255 / 0.08)"
                    stroke="rgb(255 255 255 / 0.28)"
                    strokeWidth={1}
                  />
                  {!failed.has(member.id) && (
                    <>
                      <clipPath id={clipId}>
                        <circle cx={x} cy={y} r={r - 1.5} />
                      </clipPath>
                      <image
                        href={faviconUrl(member.domain)}
                        x={x - (r - 1.5)}
                        y={y - (r - 1.5)}
                        width={(r - 1.5) * 2}
                        height={(r - 1.5) * 2}
                        clipPath={`url(#${clipId})`}
                        preserveAspectRatio="xMidYMid slice"
                        onError={() => markFailed(member.id)}
                      />
                    </>
                  )}
                  {failed.has(member.id) && (
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-zinc-200"
                      style={{ fontSize: Math.max(7, r * 0.68), fontWeight: 600 }}
                    >
                      {initials(member.name)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
