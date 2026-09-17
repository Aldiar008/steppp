import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root sits one level up, which makes Turbopack guess the wrong
  // workspace root and ignore this project's lockfile.
  turbopack: { root: path.resolve(process.cwd()) },
  typedRoutes: true,

  /**
   * Hosts allowed to request dev-only assets.
   *
   * The dev server allows `localhost` and nothing else by default, so opening
   * the app at `127.0.0.1` or at the machine's LAN address blocks the HMR
   * connection and the client bundle never runs. The page still renders —
   * server-side — which makes the failure look like a design problem rather
   * than a blocked request: the moon is a client component, so it simply is
   * not there, and nothing that reacts to scrolling reacts.
   *
   * Development only; production serves the same bundle to every host.
   */
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
