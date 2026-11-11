import { create as createQrCode } from 'qrcode';
import { canvasToBlob, downloadBlob } from './share';

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

export interface QrPngOptions extends Omit<QrDrawOptions, 'x' | 'y' | 'size'> {
  /** Output size in pixels. Defaults to 1024. */
  size?: number;
}

/** Renders a standalone QR code onto a fresh canvas. */
export function renderQrCanvas(text: string, options: QrPngOptions = {}): HTMLCanvasElement {
  const { size = 1024, ...rest } = options;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  drawQr(ctx, text, { x: 0, y: 0, size, ...rest });
  return canvas;
}

/** Downloads a high-resolution PNG of `text` as a QR code. */
export async function downloadQrPng(text: string, filename: string, options: QrPngOptions = {}): Promise<void> {
  const canvas = renderQrCanvas(text, options);
  const blob = await canvasToBlob(canvas);
  downloadBlob(blob, filename);
}
