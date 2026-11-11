import { useEffect, useRef, useState } from 'react';
import { SNOW_BURST_EVENT } from '../lib/snow';

/** Snow falls this many degrees away from straight down (drifting to the right). */
const FALL_ANGLE_DEGREES = 2.5;
const DRIFT_RATIO = Math.tan((FALL_ANGLE_DEGREES * Math.PI) / 180);

interface Flake {
  x: number;
  y: number;
  radius: number;
  /** Fall speed in pixels per second. */
  speed: number;
  opacity: number;
  blue: boolean;
  /** Burst flakes are removed once they leave the screen. */
  temporary: boolean;
}

const rand = (min: number, max: number): number => min + Math.random() * (max - min);

function createFlake(width: number, height: number, anywhere: boolean, temporary = false): Flake {
  const blue = Math.random() < 0.22;
  return {
    x: rand(-height * DRIFT_RATIO, width),
    y: anywhere ? rand(0, height) : rand(-40, -4),
    radius: blue ? rand(1.2, 2.8) : rand(1.5, 4.4),
    speed: temporary ? rand(110, 260) : rand(28, 78),
    opacity: blue ? rand(0.35, 0.7) : rand(0.65, 0.95),
    blue,
    temporary,
  };
}

function drawFlake(ctx: CanvasRenderingContext2D, flake: Flake): void {
  ctx.beginPath();
  ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
  if (flake.blue) {
    ctx.fillStyle = `rgba(47, 107, 255, ${flake.opacity})`;
    ctx.fill();
  } else {
    ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
    ctx.fill();
    // A faint blue rim keeps white flakes visible on the warm background.
    ctx.strokeStyle = `rgba(47, 107, 255, ${flake.opacity * 0.28})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}

/**
 * Fixed, click-through canvas that draws falling snow over the whole app.
 * Every flake falls at a constant 2.5 degree angle from vertical.
 * With "reduce motion" turned on, snow still falls but at half speed.
 */
export function SnowCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState<boolean>(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const speedScale = reducedMotion ? 0.5 : 1;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let flakes: Flake[] = [];
    let frame = 0;
    let lastTime = performance.now();

    const targetCount = (): number =>
      Math.round(Math.min(150, Math.max(45, (width * height) / 12000)));

    const resize = (): void => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const permanent = flakes.filter((flake) => !flake.temporary);
      const wanted = targetCount();
      if (permanent.length > wanted) {
        flakes = [...permanent.slice(0, wanted), ...flakes.filter((flake) => flake.temporary)];
      } else {
        for (let i = permanent.length; i < wanted; i += 1) flakes.push(createFlake(width, height, true));
      }
    };

    const tick = (now: number): void => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      ctx.clearRect(0, 0, width, height);

      for (let i = flakes.length - 1; i >= 0; i -= 1) {
        const flake = flakes[i];
        const fall = flake.speed * speedScale * dt;
        flake.y += fall;
        // Horizontal movement is tied to the fall so the path stays at 2.5 degrees.
        flake.x += fall * DRIFT_RATIO;

        if (flake.y - flake.radius > height || flake.x - flake.radius > width) {
          if (flake.temporary) {
            flakes.splice(i, 1);
            continue;
          }
          // Respawn above the top edge, far enough left that the angle still covers the screen.
          flake.y = -flake.radius - rand(0, 20);
          flake.x = rand(-height * DRIFT_RATIO, width);
        }

        drawFlake(ctx, flake);
      }
      frame = window.requestAnimationFrame(tick);
    };

    const burst = (): void => {
      for (let i = 0; i < 60; i += 1) flakes.push(createFlake(width, height, false, true));
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener(SNOW_BURST_EVENT, burst);
    lastTime = performance.now();
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener(SNOW_BURST_EVENT, burst);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="snow-canvas" aria-hidden="true" />;
}
