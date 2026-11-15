import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { messageFromError } from '../db/errors';
import { useToast } from '../hooks/toast';
import { LEGAL } from '../lib/legal';
import {
  REPORT_DETAILS_MAX,
  REPORT_REASONS,
  reportConfession,
  type ReportReason,
} from '../services/reports';
import { Button } from './Button';
import { Modal } from './Modal';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  confessionId: string;
}

/** Lets anyone flag a public confession (or one they received) for review. */
export function ReportDialog({ open, onClose, confessionId }: ReportDialogProps) {
  const toast = useToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Start clean each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setReason(null);
    setDetails('');
    setError(null);
    setBusy(false);
  }, [open]);

  const submit = async () => {
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      await reportConfession({ confessionId, reason, details });
      toast.show('Thanks. Your report was sent for review.', 'success');
      onClose();
    } catch (caught) {
      const message = messageFromError(caught);
      setError(message);
      toast.show(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Report this confession">
      <div className="report-form">
        <p className="muted">
          Tell us what is wrong with this confession. Reports are private, and the person who wrote
          it is never told who reported it. If someone is in immediate danger, contact your local
          emergency services.
        </p>

        <fieldset className="report-reasons">
          <legend>Why are you reporting this?</legend>
          {REPORT_REASONS.map((option) => (
            <label
              key={option.value}
              className={`report-reason ${reason === option.value ? 'report-reason-active' : ''}`}
            >
              <input
                type="radio"
                className="sr-only"
                name="report-reason"
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <label htmlFor="report-details" className="report-details-label">
          Anything else we should know? <span className="muted">(optional)</span>
        </label>
        <textarea
          id="report-details"
          rows={3}
          maxLength={REPORT_DETAILS_MAX}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="Add context for the reviewer..."
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="row">
          <Button onClick={() => void submit()} disabled={!reason || busy}>
            {busy ? 'Sending...' : 'Send report'}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
        </div>

        <p className="side-small">
          Reports are handled under our <Link to="/terms">Terms</Link> and{' '}
          <Link to="/privacy">Privacy Policy</Link>. Questions? Email{' '}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </div>
    </Modal>
  );
}
