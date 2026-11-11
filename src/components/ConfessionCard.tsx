import { useState } from 'react';
import { motion } from 'framer-motion';
import { messageFromError } from '../db/errors';
import { useToast } from '../hooks/toast';
import { formatRelative } from '../lib/time';
import {
  answerConfession,
  markRead,
  removeConfession,
  type Confession,
} from '../services/confessions';
import { LIMITS } from '../services/validation';
import { Button } from './Button';
import { ReactionBar } from './ReactionBar';

interface ConfessionCardProps {
  confession: Confession;
  /** Called after a change so the inbox can reload. */
  onChanged: () => void;
}

export function ConfessionCard({ confession, onChanged }: ConfessionCardProps) {
  const toast = useToast();
  const [replying, setReplying] = useState(false);
  const [answer, setAnswer] = useState(confession.answer ?? '');
  const [isPublic, setIsPublic] = useState(confession.isPublic);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unread = confession.readAt === null;

  const run = async (action: () => Promise<void>, successMessage?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      setError(null);
      if (successMessage) toast.show(successMessage, 'success');
      onChanged();
    } catch (caught) {
      const message = messageFromError(caught);
      setError(message);
      toast.show(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAnswer = () => {
    void run(async () => {
      await answerConfession(confession.id, answer, isPublic);
      setReplying(false);
    }, isPublic ? 'Reply saved and posted to your public page.' : 'Reply saved privately.');
  };

  return (
    <motion.li
      layout
      className={`confession ${unread ? 'confession-unread' : ''}`}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      <div className="confession-top">
        <span className="confession-time">
          {unread && <span className="unread-dot" aria-label="Unread" />}
          {formatRelative(confession.createdAt)}
        </span>
        {confession.promptText && <span className="confession-prompt">{confession.promptText}</span>}
      </div>

      <p className="confession-body">{confession.body}</p>

      {confession.answer && !replying && (
        <div className="confession-answer">
          <span className="answer-label">
            Your reply · {confession.isPublic ? 'public' : 'private'}
          </span>
          <p>{confession.answer}</p>
          {confession.isPublic && <ReactionBar confessionId={confession.id} readOnly />}
        </div>
      )}

      {replying && (
        <div className="reply-box">
          <label htmlFor={`answer-${confession.id}`} className="sr-only">
            Your reply
          </label>
          <textarea
            id={`answer-${confession.id}`}
            rows={3}
            maxLength={LIMITS.answerMax}
            placeholder="Write your reply..."
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            autoFocus
          />
          <label className="check">
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
            <span>Show this reply on my public page</span>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="row">
            <Button onClick={handleSaveAnswer} disabled={busy}>
              {busy ? 'Saving...' : 'Save reply'}
            </Button>
            <Button variant="ghost" onClick={() => setReplying(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {confirmingDelete ? (
        <div className="confirm" role="alertdialog" aria-label="Delete this confession?">
          <p>Delete this confession? This can&apos;t be undone.</p>
          <div className="row">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                void run(() => removeConfession(confession.id), 'Confession deleted.');
              }}
            >
              Delete confession
            </Button>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)} disabled={busy}>
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        !replying && (
          <div className="confession-actions">
            <button type="button" className="link-btn" onClick={() => setReplying(true)}>
              {confession.answer ? 'Edit reply' : 'Reply'}
            </button>
            {unread && (
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  void run(() => markRead(confession.id));
                }}
              >
                Mark as read
              </button>
            )}
            <button type="button" className="link-btn link-danger" onClick={() => setConfirmingDelete(true)}>
              Delete
            </button>
          </div>
        )
      )}
    </motion.li>
  );
}
