/**
 * Shared canvas primitives for the downloadable images (the story card and the
 * QR card). Both images share one palette, one pair of fonts, and one set of
 * drawing helpers, so a change here keeps them looking like the same brand.
 *
 * The colors mirror the CSS custom properties in `src/styles.css`.
 */

export const C = {
  sand: '#d8cbb3',
  sandLight: '#efe7d6',
  sandLighter: '#f7f2e8',
  blue: '#2f6bff',
  blueDark: '#2459e0',
  ink: '#0f1b3d',
  inkSoft: '#3b4a73',
  white: '#ffffff',
} as const;

export const DISPLAY = '"Fraunces", Georgia, "Times New Roman", serif';
export const BODY = '"DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export type Ctx = CanvasRenderingContext2D;

/** Waits for the site fonts so a downloaded PNG never uses a fallback face. */
export async function ensureFonts(specs: readonly string[]): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all(specs.map((spec) => document.fonts.load(spec)));
    await document.fonts.ready;
  } catch {
    /* Fall back to the system fonts. */
  }
}

export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Draws text centered at `cx` with extra space between characters. */
export function drawSpacedText(ctx: Ctx, text: string, cx: number, top: number, spacing: number): void {
  const characters = [...text];
  const widths = characters.map((character) => ctx.measureText(character).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + spacing * (characters.length - 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let cursor = cx - total / 2;
  characters.forEach((character, index) => {
    ctx.fillText(character, cursor, top);
    cursor += widths[index] + spacing;
  });
}

export function drawSnowflake(ctx: Ctx, cx: number, cy: number, radius: number, color: string, lineWidth: number): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const angle of [0, 60, 120]) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, radius);
    ctx.moveTo(-radius * 0.32, -radius * 0.62);
    ctx.lineTo(0, -radius * 0.42);
    ctx.lineTo(radius * 0.32, -radius * 0.62);
    ctx.moveTo(-radius * 0.32, radius * 0.62);
    ctx.lineTo(0, radius * 0.42);
    ctx.lineTo(radius * 0.32, radius * 0.62);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Deterministic sprinkle of snow, so the same image always looks the same. */
export function drawSnowfall(ctx: Ctx, width: number, height: number, seed = 20261224, count = 90): void {
  let state = seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  ctx.save();
  ctx.fillStyle = C.white;
  for (let i = 0; i < count; i += 1) {
    const x = random() * width;
    const y = random() * height;
    const radius = 1.5 + random() * 4;
    ctx.globalAlpha = 0.25 + random() * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A soft, rounded card panel. */
export function drawPanel(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  shadow = true,
  radius = 56,
): void {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(15, 27, 61, 0.18)';
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 22;
  }
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}
