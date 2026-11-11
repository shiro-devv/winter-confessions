import { useEffect, useRef } from 'react';
import { drawQr } from '../lib/qr';

interface QrCodeProps {
  text: string;
  /** Rendered size in CSS pixels. */
  size?: number;
  className?: string;
}

/** Draws `text` as a crisp QR code, sharp on high-density screens. */
export function QrCode({ text, size = 240, className }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scale = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(size * scale);
    canvas.height = Math.round(size * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawQr(ctx, text, { x: 0, y: 0, size, dark: '#0f1b3d', light: '#ffffff', margin: 3 });
    } catch {
      // Never let an encoding failure take down the page; leave a blank tile.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [text, size]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`QR code linking to ${text}`}
    />
  );
}
