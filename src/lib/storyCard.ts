import {
  BODY,
  C,
  DISPLAY,
  drawPanel,
  drawSnowflake,
  drawSnowfall,
  drawSpacedText,
  ensureFonts,
  type Ctx,
} from './canvas';
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

const CARD_X = 80;
const CARD_W = STORY_WIDTH - CARD_X * 2;
const PAD = 72;
const INNER_W = CARD_W - PAD * 2;
const GAP = 44;
const REGION_TOP = 380;
const REGION_BOTTOM = 1470;

// Footer / QR geometry, shared so the snowman can avoid the QR panel.
const FOOTER_TOP = 1540;
const QR_SIZE = 216;
const QR_PAD = 26;
const QR_X = CARD_X + CARD_W - QR_PAD - QR_SIZE;
const QR_PANEL_LEFT = QR_X - QR_PAD;

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

/** Draws a friendly snowman standing on the ground at (cx, baseY). */
function drawSnowman(ctx: Ctx, cx: number, baseY: number, height: number): void {
  const r1 = height * 0.27;
  const r2 = height * 0.185;
  const r3 = height * 0.125;
  const cy1 = baseY - r1;
  const cy2 = cy1 - (r1 + r2) * 0.82;
  const cy3 = cy2 - (r2 + r3) * 0.82;
  const outline = 'rgba(15, 27, 61, 0.16)';

  ctx.save();

  // Soft shadow so the snowman looks like it is standing on the ground.
  ctx.fillStyle = 'rgba(15, 27, 61, 0.12)';
  ctx.beginPath();
  ctx.ellipse(cx, baseY, r1 * 1.05, r1 * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  const ball = (x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.045);
    ctx.strokeStyle = outline;
    ctx.stroke();
  };
  ball(cx, cy1, r1);
  ball(cx, cy2, r2);
  ball(cx, cy3, r3);

  // Twig arms.
  ctx.strokeStyle = '#7a5230';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, height * 0.015);
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * r2 * 0.55, cy2);
    ctx.lineTo(cx + dir * (r2 + height * 0.17), cy2 - height * 0.06);
    ctx.moveTo(cx + dir * (r2 + height * 0.09), cy2 - height * 0.03);
    ctx.lineTo(cx + dir * (r2 + height * 0.14), cy2 - height * 0.12);
    ctx.stroke();
  }

  // Scarf around the neck, with a short tail.
  const neckY = cy2 - r2 * 0.62;
  ctx.fillStyle = C.blue;
  ctx.beginPath();
  ctx.ellipse(cx, neckY, r3 * 1.25, r3 * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - r3 * 0.35, neckY);
  ctx.lineTo(cx - r3 * 0.05, neckY);
  ctx.lineTo(cx - r3 * 0.25, neckY + height * 0.2);
  ctx.lineTo(cx - r3 * 0.62, neckY + height * 0.17);
  ctx.closePath();
  ctx.fill();

  // Eyes.
  ctx.fillStyle = C.ink;
  const eyeR = Math.max(1.6, r3 * 0.12);
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + dir * r3 * 0.36, cy3 - r3 * 0.2, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Carrot nose.
  ctx.fillStyle = '#e8842f';
  ctx.beginPath();
  ctx.moveTo(cx + r3 * 0.05, cy3 + r3 * 0.02);
  ctx.lineTo(cx + r3 * 1.05, cy3 + r3 * 0.18);
  ctx.lineTo(cx + r3 * 0.05, cy3 + r3 * 0.32);
  ctx.closePath();
  ctx.fill();

  // Buttons down the middle ball, below the scarf.
  ctx.fillStyle = C.inkSoft;
  for (let i = 0; i < 3; i += 1) {
    const t = -0.02 + i * 0.36;
    ctx.beginPath();
    ctx.arc(cx, cy2 + r2 * t, Math.max(1.4, r2 * 0.1), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Adds one snowman somewhere along the bottom, with a random spot and size. */
function drawRandomSnowman(ctx: Ctx): void {
  const height = 110 + Math.random() * 70;
  const minX = CARD_X + 70;
  // Stay clear of the QR panel so the code stays crisp and unbroken.
  const maxX = Math.max(minX, QR_PANEL_LEFT - 130);
  const cx = minX + Math.random() * (maxX - minX);
  // Sit below the footer text so the face is never hidden by it.
  const baseY = STORY_HEIGHT - 14 - Math.random() * 20;
  drawSnowman(ctx, cx, baseY, height);
}

function drawFooter(ctx: Ctx, username: string, url: string): void {
  const top = FOOTER_TOP;
  const qrSize = QR_SIZE;
  const tilePad = QR_PAD;
  const qrX = QR_X;
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
  drawSnowfall(ctx, STORY_WIDTH, STORY_HEIGHT);

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

  drawRandomSnowman(ctx);
  drawFooter(ctx, username, input.url);
  ctx.restore();
}

/** Renders the card to an offscreen canvas, fonts loaded. */
export async function renderStoryCard(input: StoryCardInput): Promise<HTMLCanvasElement> {
  await ensureFonts(FONT_SPECS);
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
