import { create as createQrCode } from 'qrcode';
import {
  BODY,
  C,
  DISPLAY,
  drawPanel,
  drawSnowflake,
  drawSnowfall,
  drawSpacedText,
  ensureFonts,
  roundRectPath,
  type Ctx,
} from './canvas';
import { canvasToBlob, downloadBlob, slugify } from './share';

/** The bit of a 2D context that drawing a QR needs. */
type Ctx2D = Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'>;

export interface QrDrawOptions {
  /** Top-left corner of the QR square. */
  x: number;
  y: number;
  /** Width and height of the square, in CSS pixels. */
  size: number;
  dark?: string;
  light?: string;
  /** Quiet zone, in modules. The spec asks for at least 4. */
  margin?: number;
}

/** Draws `text` as a QR code, anchored at its top-left corner. */
export function drawQr(ctx: Ctx2D, text: string, options: QrDrawOptions): void {
  const { x, y, size, dark = '#0f1b3d', light = '#ffffff', margin = 4 } = options;
  const { modules } = createQrCode(text, { errorCorrectionLevel: 'M' });
  const count = modules.size;
  const data = modules.data;
  const cell = size / (count + margin * 2);

  ctx.fillStyle = light;
  ctx.fillRect(x, y, size, size);

  ctx.fillStyle = dark;
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (!data[row * count + col]) continue;
      // Slight overshoot avoids hairline gaps between modules, but never let a
      // module bleed past the requested square.
      const px = x + (col + margin) * cell;
      const py = y + (row + margin) * cell;
      ctx.fillRect(px, py, Math.min(cell + 0.5, x + size - px), Math.min(cell + 0.5, y + size - py));
    }
  }
}

/** Square share card (1:1) for the downloadable QR code. */
export const QR_CARD_SIZE = 1080;

export interface QrCardInput {
  /** Handle of the link owner, with or without a leading "@". */
  username: string;
  /** Absolute link to the owner's public page. Encoded as the QR code. */
  url: string;
}

const QR_CARD_FONTS = [
  `800 54px ${DISPLAY}`,
  `700 30px ${BODY}`,
  `500 28px ${BODY}`,
  `600 26px ${BODY}`,
  `500 22px ${BODY}`,
];

/** Paints the sand-and-blue background shared with the story card. */
function drawQrCardBackground(ctx: Ctx, size: number): void {
  const base = ctx.createLinearGradient(0, 0, 0, size);
  base.addColorStop(0, C.sandLighter);
  base.addColorStop(0.5, C.sandLight);
  base.addColorStop(1, C.sand);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const glow = ctx.createRadialGradient(size * 0.86, size * 0.06, 0, size * 0.86, size * 0.06, size * 0.9);
  glow.addColorStop(0, 'rgba(47, 107, 255, 0.22)');
  glow.addColorStop(1, 'rgba(47, 107, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  const glow2 = ctx.createRadialGradient(size * 0.08, size * 0.9, 0, size * 0.08, size * 0.9, size * 0.8);
  glow2.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  glow2.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, size, size);
}

/** Paints the full themed QR card. Pure canvas, no DOM access. */
export function drawQrCard(ctx: Ctx, input: QrCardInput): void {
  const size = QR_CARD_SIZE;
  const username = input.username.replace(/^@+/, '');
  const url = input.url;

  ctx.save();
  ctx.clearRect(0, 0, size, size);
  drawQrCardBackground(ctx, size);
  drawSnowfall(ctx, size, size, 20261115, 70);

  // Brand mark, matching the story card header.
  drawSnowflake(ctx, size / 2, 122, 30, C.blue, 6);
  ctx.fillStyle = C.inkSoft;
  ctx.font = `700 30px ${BODY}`;
  drawSpacedText(ctx, 'WINTER CONFESSIONS', size / 2, 178, 9);

  // White panel with the site's signature ink border, so the code keeps its
  // quiet zone and scans anywhere.
  const panelSize = 584;
  const panelX = (size - panelSize) / 2;
  const panelY = 240;
  const panelRadius = 44;
  const innerPad = 34;
  drawPanel(ctx, panelX, panelY, panelSize, panelSize, C.white, false, panelRadius);
  ctx.save();
  roundRectPath(ctx, panelX, panelY, panelSize, panelSize, panelRadius);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
  drawQr(ctx, url, {
    x: panelX + innerPad,
    y: panelY + innerPad,
    size: panelSize - innerPad * 2,
    dark: C.ink,
    light: C.white,
    margin: 2,
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.fillStyle = C.ink;
  ctx.font = `800 54px ${DISPLAY}`;
  ctx.fillText(`@${username}`, size / 2, 860);

  ctx.fillStyle = C.inkSoft;
  ctx.font = `500 28px ${BODY}`;
  ctx.fillText('send me anonymous confessions', size / 2, 928);

  const displayUrl = url.replace(/^https?:\/\//, '');
  let urlSize = 26;
  ctx.font = `600 ${urlSize}px ${BODY}`;
  while (urlSize > 16 && ctx.measureText(displayUrl).width > size - 160) {
    urlSize -= 1;
    ctx.font = `600 ${urlSize}px ${BODY}`;
  }
  ctx.fillStyle = C.blueDark;
  ctx.fillText(displayUrl, size / 2, 972);

  ctx.fillStyle = 'rgba(15, 27, 61, 0.5)';
  ctx.font = `500 22px ${BODY}`;
  ctx.fillText('scan to send a confession', size / 2, 1022);

  ctx.restore();
}

/** Renders the QR card to an offscreen canvas, fonts loaded. */
export async function renderQrCard(input: QrCardInput): Promise<HTMLCanvasElement> {
  await ensureFonts(QR_CARD_FONTS);
  const canvas = document.createElement('canvas');
  canvas.width = QR_CARD_SIZE;
  canvas.height = QR_CARD_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  drawQrCard(ctx, input);
  return canvas;
}

/** Renders and downloads the themed QR card as a PNG. */
export async function downloadQrCard(input: QrCardInput): Promise<void> {
  const canvas = await renderQrCard(input);
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, `winter-confessions-${slugify(input.username)}-qr.png`);
}
