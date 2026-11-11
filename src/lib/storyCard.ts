import { drawQr } from './qr';
import { canvasToBlob, downloadBlob, slugify } from './share';

/** Instagram / TikTok story canvas (9:16). */
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export interface StoryCardInput {
  /** Handle of the link owner, with or without a leading "@". */
  username: string;
  /** Absolute link to the owner's public page. Also encoded as a QR code. */
  url: string;
  body: string;
  promptText?: string | null;
  /** The owner's reply. Omit it for private replies. */
  answer?: string | null;
  /** Small date under the reply, e.g. "Dec 24, 2026". */
  dateLabel?: string | null;
}

const C = {
  sand: '#d8cbb3',
  sandLight: '#efe7d6',
  sandLighter: '#f7f2e8',
  blue: '#2f6bff',
  blueDark: '#2459e0',
  ink: '#0f1b3d',
  inkSoft: '#3b4a73',
  white: '#ffffff',
} as const;

const DISPLAY = '"Fraunces", Georgia, "Times New Roman", serif';
const BODY = '"DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const CARD_X = 80;
const CARD_W = STORY_WIDTH - CARD_X * 2;
const PAD = 72;
const INNER_W = CARD_W - PAD * 2;
const GAP = 44;
const REGION_TOP = 380;
const REGION_BOTTOM = 1470;

type Ctx = CanvasRenderingContext2D;

interface FittedText {
  /** Full CSS font string, ready to assign back to `ctx.font`. */
  font: string;
  lines: string[];
  lineHeight: number;
  height: number;
}

const FONT_SPECS = [
  `800 84px ${DISPLAY}`,
  `600 62px ${DISPLAY}`,
  `700 34px ${BODY}`,
  `700 28px ${BODY}`,
  `600 30px ${BODY}`,
  `600 28px ${BODY}`,
  `500 44px ${BODY}`,
  `500 24px ${BODY}`,
];

/** The card uses the site fonts; wait for them so the PNG is not a fallback. */
async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all(FONT_SPECS.map((spec) => document.fonts.load(spec)));
    await document.fonts.ready;
  } catch {
    /* Fall back to the system fonts. */
  }
}

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Breaks `text` into lines that fit `maxWidth`, honouring explicit newlines. */
function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = '';
      }
      // A single word can still be wider than the line; split it by character
      // so it can never spill outside the panel.
      let chunk = '';
      for (const character of word) {
        if (chunk && ctx.measureText(chunk + character).width > maxWidth) {
          lines.push(chunk);
          chunk = character;
        } else {
          chunk += character;
        }
      }
      line = chunk;
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Shrinks the font until the text fits the box, then clips with an ellipsis. */
function fitText(
  ctx: Ctx,
  text: string,
  options: {
    maxWidth: number;
    maxHeight: number;
    font: string;
    weight: number;
    minSize: number;
    maxSize: number;
    lineHeight: number;
  },
): FittedText {
  const { maxWidth, maxHeight, font, weight, minSize, maxSize, lineHeight } = options;

  for (let size = maxSize; size >= minSize; size -= 2) {
    const cssFont = `${weight} ${size}px ${font}`;
    ctx.font = cssFont;
    const lines = wrapText(ctx, text, maxWidth);
    const height = lines.length * size * lineHeight;
    if (height <= maxHeight) return { font: cssFont, lines, lineHeight: size * lineHeight, height };
  }

  const cssFont = `${weight} ${minSize}px ${font}`;
  ctx.font = cssFont;
  const lh = minSize * lineHeight;
  const maxLines = Math.max(1, Math.floor(maxHeight / lh));
  const all = wrapText(ctx, text, maxWidth);
  const lines = all.slice(0, maxLines);
  if (all.length > maxLines) {
    let last = lines[maxLines - 1] ?? '';
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return { font: cssFont, lines, lineHeight: lh, height: lines.length * lh };
}

function drawLines(
  ctx: Ctx,
  lines: string[],
  options: { cx: number; top: number; lineHeight: number },
): void {
  const { cx, top, lineHeight } = options;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let cursor = top;
  for (const line of lines) {
    ctx.fillText(line, cx, cursor);
    cursor += lineHeight;
  }
}

/** Draws text centered at `cx` with extra space between characters. */
function drawSpacedText(ctx: Ctx, text: string, cx: number, top: number, spacing: number): void {
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

function drawSnowflake(ctx: Ctx, cx: number, cy: number, radius: number, color: string, lineWidth: number): void {
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

function drawPanel(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, shadow = true): void {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(15, 27, 61, 0.18)';
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 22;
  }
  roundRectPath(ctx, x, y, w, h, 56);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawBackground(ctx: Ctx): void {
  const base = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
  base.addColorStop(0, C.sandLighter);
  base.addColorStop(0.5, C.sandLight);
  base.addColorStop(1, C.sand);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const glow = ctx.createRadialGradient(STORY_WIDTH * 0.88, STORY_HEIGHT * 0.05, 0, STORY_WIDTH * 0.88, STORY_HEIGHT * 0.05, STORY_WIDTH * 0.95);
  glow.addColorStop(0, 'rgba(47, 107, 255, 0.22)');
  glow.addColorStop(1, 'rgba(47, 107, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const glow2 = ctx.createRadialGradient(STORY_WIDTH * 0.06, STORY_HEIGHT * 0.74, 0, STORY_WIDTH * 0.06, STORY_HEIGHT * 0.74, STORY_WIDTH * 0.8);
  glow2.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  glow2.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
}

/** Deterministic sprinkle of snow, so the same card always looks the same. */
function drawSnowfall(ctx: Ctx): void {
  let seed = 20261224;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  ctx.save();
  ctx.fillStyle = C.white;
  for (let i = 0; i < 90; i += 1) {
    const x = random() * STORY_WIDTH;
    const y = random() * STORY_HEIGHT;
    const radius = 1.5 + random() * 4;
    ctx.globalAlpha = 0.25 + random() * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFooter(ctx: Ctx, username: string, url: string): void {
  const top = 1540;
  const qrSize = 216;
  const tilePad = 26;
  const qrX = CARD_X + CARD_W - tilePad - qrSize;
  const textX = CARD_X + 20;
  const textW = qrX - tilePad - textX - 40;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const handle = `@${username}`;
  let handleSize = 62;
  ctx.font = `800 ${handleSize}px ${DISPLAY}`;
  while (handleSize > 34 && ctx.measureText(handle).width > textW) {
    handleSize -= 2;
    ctx.font = `800 ${handleSize}px ${DISPLAY}`;
  }
  ctx.fillStyle = C.ink;
  ctx.fillText(handle, textX, top);

  ctx.font = `500 30px ${BODY}`;
  ctx.fillStyle = C.inkSoft;
  ctx.fillText('send me anonymous confessions', textX, top + 84);

  const displayUrl = url.replace(/^https?:\/\//, '');
  let urlSize = 28;
  ctx.font = `600 ${urlSize}px ${BODY}`;
  while (urlSize > 18 && ctx.measureText(displayUrl).width > textW) {
    urlSize -= 1;
    ctx.font = `600 ${urlSize}px ${BODY}`;
  }
  ctx.fillStyle = C.blueDark;
  ctx.fillText(displayUrl, textX, top + 134);

  const qrY = top - 20;
  drawPanel(ctx, qrX - tilePad, qrY - tilePad, qrSize + tilePad * 2, qrSize + tilePad * 2, C.white, false);
  drawQr(ctx, url, { x: qrX, y: qrY, size: qrSize, dark: C.ink, light: C.white, margin: 0 });

  ctx.textAlign = 'center';
  ctx.font = `500 24px ${BODY}`;
  ctx.fillStyle = 'rgba(15, 27, 61, 0.55)';
  ctx.fillText('made with Winter Confessions', STORY_WIDTH / 2, 1848);
}

/** Paints the full 1080x1920 story card. Pure canvas, no DOM access. */
export function drawStoryCard(ctx: Ctx, input: StoryCardInput): void {
  const username = input.username.replace(/^@+/, '');
  const answer = input.answer?.trim() ? input.answer.trim() : null;
  const promptText = input.promptText?.trim() ?? '';

  ctx.save();
  ctx.clearRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  drawBackground(ctx);
  drawSnowfall(ctx);

  drawSnowflake(ctx, STORY_WIDTH / 2, 168, 44, C.blue, 7);
  ctx.fillStyle = C.inkSoft;
  ctx.font = `700 34px ${BODY}`;
  drawSpacedText(ctx, 'WINTER CONFESSIONS', STORY_WIDTH / 2, 250, 10);

  // Measure everything before drawing so the stack can be centered.
  ctx.font = `700 28px ${BODY}`;
  const promptLines = promptText ? wrapText(ctx, promptText, INNER_W) : [];
  const promptH = promptLines.length > 0 ? promptLines.length * 28 * 1.35 + 36 : 0;

  const regionH = REGION_BOTTOM - REGION_TOP;
  const labelH = 62;

  // The reply is measured first, against a fixed budget, so the confession can
  // take exactly the space that is left. This keeps tall cards clear of the
  // footer no matter how long the prompt, confession and reply are.
  let answerText: FittedText | null = null;
  let cardBH = 0;
  if (answer) {
    answerText = fitText(ctx, answer, {
      maxWidth: INNER_W,
      maxHeight: 220,
      font: BODY,
      weight: 500,
      minSize: 26,
      maxSize: 44,
      lineHeight: 1.4,
    });
    cardBH = PAD * 2 + labelH + answerText.height + (input.dateLabel ? 44 : 0);
  }

  const bodyBudget = Math.max(180, regionH - PAD * 2 - promptH - (answer ? GAP + cardBH : 0));
  const body = fitText(ctx, input.body, {
    maxWidth: INNER_W,
    maxHeight: bodyBudget,
    font: DISPLAY,
    weight: 800,
    minSize: 34,
    maxSize: 84,
    lineHeight: 1.3,
  });

  const cardAH = PAD * 2 + promptH + body.height;

  const totalH = cardAH + (answer ? GAP + cardBH : 0);
  // Center the stack in the region. The budget above guarantees it fits, but a
  // pathologically long prompt can still overflow, so lift the stack as needed.
  let y = REGION_TOP + Math.max(0, (regionH - totalH) / 2);
  if (y + totalH > REGION_BOTTOM) y = Math.max(300, REGION_BOTTOM - totalH);

  // Confession card.
  drawPanel(ctx, CARD_X, y, CARD_W, cardAH, 'rgba(255, 255, 255, 0.9)');
  let cursor = y + PAD;
  if (promptLines.length > 0) {
    ctx.font = `700 28px ${BODY}`;
    ctx.fillStyle = C.blue;
    drawLines(ctx, promptLines, { cx: STORY_WIDTH / 2, top: cursor, lineHeight: 28 * 1.35 });
    cursor += promptLines.length * 28 * 1.35 + 36;
  }
  ctx.font = body.font;
  ctx.fillStyle = C.ink;
  drawLines(ctx, body.lines, { cx: STORY_WIDTH / 2, top: cursor, lineHeight: body.lineHeight });

  // Reply card.
  if (answerText) {
    y += cardAH + GAP;
    drawPanel(ctx, CARD_X, y, CARD_W, cardBH, 'rgba(47, 107, 255, 0.14)');
    let replyCursor = y + PAD;
    ctx.fillStyle = C.blueDark;
    ctx.font = `700 28px ${BODY}`;
    drawSpacedText(ctx, 'THE REPLY', STORY_WIDTH / 2, replyCursor, 6);
    replyCursor += labelH;
    ctx.font = answerText.font;
    ctx.fillStyle = C.ink;
    drawLines(ctx, answerText.lines, { cx: STORY_WIDTH / 2, top: replyCursor, lineHeight: answerText.lineHeight });
    replyCursor += answerText.height;
    if (input.dateLabel) {
      ctx.font = `600 26px ${BODY}`;
      ctx.fillStyle = C.inkSoft;
      ctx.textAlign = 'center';
      ctx.fillText(input.dateLabel, STORY_WIDTH / 2, replyCursor + 8);
    }
  }

  drawFooter(ctx, username, input.url);
  ctx.restore();
}

/** Renders the card to an offscreen canvas, fonts loaded. */
export async function renderStoryCard(input: StoryCardInput): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  drawStoryCard(ctx, input);
  return canvas;
}

/** Renders and downloads the card as a PNG. */
export async function downloadStoryCard(input: StoryCardInput): Promise<void> {
  const canvas = await renderStoryCard(input);
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, storyCardFileName(input.username));
}

/** A stable file name such as "winter-confessions-shiro.png". */
export function storyCardFileName(username: string): string {
  return `winter-confessions-${slugify(username)}.png`;
}
