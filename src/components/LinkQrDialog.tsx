import { useState } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { QrCode } from './QrCode';
import { useToast } from '../hooks/toast';
import { downloadQrPng } from '../lib/qr';
import { copyText, slugify } from '../lib/share';

interface LinkQrDialogProps {
  open: boolean;
  onClose: () => void;
  username: string;
  /** Absolute link to the owner's public page. */
  url: string;
}

/** Shows the owner's link as a downloadable QR code. */
export function LinkQrDialog({ open, onClose, username, url }: LinkQrDialogProps) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadQrPng(url, `winter-confessions-${slugify(username)}-qr.png`, { size: 1024 });
      toast.show('QR code saved as a PNG.', 'success');
    } catch {
      toast.show('We could not create the QR code image.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    const ok = await copyText(url);
    toast.show(ok ? 'Link copied.' : 'We could not copy the link.', ok ? 'success' : 'error');
  };

  return (
    <Modal open={open} onClose={onClose} title="Your link, as a QR code">
      <div className="qr-card">
        <QrCode text={url} size={240} className="qr-canvas" />
        <p className="qr-url">{url.replace(/^https?:\/\//, '')}</p>
        <div className="row qr-actions">
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Preparing...' : 'Download PNG'}
          </Button>
          <Button variant="ghost" onClick={handleCopy}>
            Copy link
          </Button>
        </div>
        <p className="side-small muted">
          Scan it with a phone camera, or drop the PNG onto a story, poster or sticker.
        </p>
      </div>
    </Modal>
  );
}
