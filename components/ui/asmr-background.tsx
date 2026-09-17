"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Integrated from the supplied source, rebuilt as a background layer rather
   than a standalone full-screen demo. Deviations:

   1. "use client" added; the original used hooks with no directive.
   2. The injected <script dangerouslySetInnerHTML> is gone. React does not
      execute script tags it renders, so it never worked, and it registered a
      global listener with no cleanup. The custom cursor and `cursor-none` went
      with it: hiding the pointer over readable content is hostile.
   3. Particle count scales with the painted area instead of being a fixed
      1000. At 1920x1080 that is the original density; a phone gets a third of
      it, which is the difference between 60fps and a slideshow.
   4. rAF pauses when the layer is off screen. The original ran forever, so
      scrolling past it kept burning a core.
   5. Resize re-seeds only on a real size change. Mobile browsers fire resize
      every time the address bar slides, and the original rebuilt every
      particle each time, which read as a flash.
   6. prefers-reduced-motion paints one still frame and stops.
   7. Pointer position is measured against the canvas rect, so the effect stays
      under the cursor while the layer is pinned and the page scrolls past it.
   ========================================================================== */

export interface AsmrBackgroundProps {
  className?: string;
  /** Particle count at 1920x1080. Scaled by area, then clamped. */
  density?: number;
  /** Trail colour as an "r, g, b" triple. Should match the page background. */
  background?: string;
  /** Magnetic vortex under the pointer. */
  interactive?: boolean;
}

const MAGNETIC_RADIUS = 280;
const VORTEX_STRENGTH = 0.07;
const PULL_STRENGTH = 0.12;
const REFERENCE_AREA = 1920 * 1080;
const MIN_PARTICLES = 220;
const MAX_PARTICLES = 1100;

export const Component = ({
  className,
  density = 1000,
  background = "10, 10, 12",
  interactive = true,
}: AsmrBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

    let width = 0;
    let height = 0;
    let frameId = 0;
    let running = false;
    let particles: Particle[] = [];
    const mouse = { x: -10000, y: -10000 };

    class Particle {
      x = 0;
      y = 0;
      vx = 0;
      vy = 0;
      size = 0;
      alpha = 0;
      color = "";
      rotation = 0;
      rotationSpeed = 0;
      frictionGlow = 0;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.5 + 0.5;
        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = (Math.random() - 0.5) * 0.2;
        // 70% charcoal, 30% glass.
        const isGlass = Math.random() > 0.7;
        this.color = isGlass ? "240, 245, 255" : "80, 80, 85";
        this.alpha = Math.random() * 0.4 + 0.1;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
      }

      update() {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.hypot(dx, dy);

        if (interactive && dist < MAGNETIC_RADIUS && dist > 0.001) {
          const force = (MAGNETIC_RADIUS - dist) / MAGNETIC_RADIUS;

          this.vx += (dx / dist) * force * PULL_STRENGTH;
          this.vy += (dy / dist) * force * PULL_STRENGTH;

          // Perpendicular component: the swirl.
          this.vx += (dy / dist) * force * VORTEX_STRENGTH * 10;
          this.vy -= (dx / dist) * force * VORTEX_STRENGTH * 10;

          this.frictionGlow = force * 0.7;
        } else {
          this.frictionGlow *= 0.92;
        }

        this.x += this.vx;
        this.y += this.vy;

        this.vx *= 0.95;
        this.vy *= 0.95;

        this.vx += (Math.random() - 0.5) * 0.04;
        this.vy += (Math.random() - 0.5) * 0.04;

        this.rotation += this.rotationSpeed + (Math.abs(this.vx) + Math.abs(this.vy)) * 0.05;

        if (this.x < -20) this.x = width + 20;
        if (this.x > width + 20) this.x = -20;
        if (this.y < -20) this.y = height + 20;
        if (this.y > height + 20) this.y = -20;
      }

      draw(target: CanvasRenderingContext2D) {
        target.save();
        target.translate(this.x, this.y);
        target.rotate(this.rotation);

        const finalAlpha = Math.min(this.alpha + this.frictionGlow, 0.9);
        target.fillStyle = `rgba(${this.color}, ${finalAlpha})`;

        // shadowBlur is the most expensive call here, so it is reserved for the
        // handful of particles actually caught in the vortex.
        if (this.frictionGlow > 0.35) {
          target.shadowBlur = 8 * this.frictionGlow;
          target.shadowColor = `rgba(180, 220, 255, ${this.frictionGlow})`;
        }

        target.beginPath();
        target.moveTo(0, -this.size * 2.5);
        target.lineTo(this.size, 0);
        target.lineTo(0, this.size * 2.5);
        target.lineTo(-this.size, 0);
        target.closePath();
        target.fill();

        target.restore();
      }
    }

    const seed = () => {
      const area = width * height;
      const count = Math.round(density * (area / REFERENCE_AREA));
      const target = Math.max(MIN_PARTICLES, Math.min(MAX_PARTICLES, count));
      particles = Array.from({ length: target }, () => new Particle());
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextWidth = Math.round(rect.width);
      const nextHeight = Math.round(rect.height);
      if (nextWidth === width && nextHeight === height) return;
      if (nextWidth === 0 || nextHeight === 0) return;

      width = nextWidth;
      height = nextHeight;

      // Capped device pixel ratio: this canvas is atmosphere, not typography,
      // and fill cost scales with the square of the ratio.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = `rgb(${background})`;
      ctx.fillRect(0, 0, width, height);
      seed();
    };

    const paint = () => {
      // Translucent wash instead of a clear: this is what leaves the trails.
      ctx.fillStyle = `rgba(${background}, 0.18)`;
      ctx.fillRect(0, 0, width, height);
      for (const p of particles) {
        p.update();
        p.draw(ctx);
      }
    };

    const loop = () => {
      paint();
      frameId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      frameId = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frameId);
    };

    let pointerFrame = 0;
    const movePointer = (clientX: number, clientY: number) => {
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        const rect = canvas.getBoundingClientRect();
        mouse.x = clientX - rect.left;
        mouse.y = clientY - rect.top;
      });
    };

    const onMouseMove = (e: MouseEvent) => movePointer(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) movePointer(touch.clientX, touch.clientY);
    };
    const onPointerLeave = () => {
      mouse.x = -10000;
      mouse.y = -10000;
    };

    resize();

    if (reduced) {
      // One still frame: the texture is there, nothing moves.
      for (const p of particles) p.draw(ctx);
    }

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(canvas);

    const visibility = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    visibility.observe(canvas);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (canvas.isConnected) start();
    };

    if (interactive && !reduced) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      document.addEventListener("mouseleave", onPointerLeave);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      if (pointerFrame) cancelAnimationFrame(pointerFrame);
      resizeObserver.disconnect();
      visibility.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("mouseleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [density, background, interactive]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("block h-full w-full", className)}
      style={{ backgroundColor: `rgb(${background})` }}
    />
  );
};

export default Component;
