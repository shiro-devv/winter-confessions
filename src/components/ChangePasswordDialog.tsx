import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { messageFromError } from '../db/errors';
import { useAuth } from '../hooks/auth';
import { useToast } from '../hooks/toast';
import { LIMITS } from '../services/validation';
import { Button } from './Button';
import { Modal } from './Modal';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Lets a logged-in person change their password from a modal. */
export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const { changePassword, requestPasswordResetForCurrentUser } = useAuth();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const clearForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError(null);
  };

  const handleClose = () => {
    // Keep the dialog open while a request is in flight.
    if (pending || sendingReset) return;
    clearForm();
    onClose();
  };

  const handleEmailReset = async () => {
    if (sendingReset) return;
    setError(null);
    setSendingReset(true);
    try {
      await requestPasswordResetForCurrentUser();
      clearForm();
      toast.show('Check your inbox for a reset link.', 'success');
      onClose();
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setSendingReset(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Those new passwords do not match. Please type them again.');
      return;
    }

    setPending(true);
    try {
      await changePassword(currentPassword, newPassword);
      clearForm();
      toast.show('Password updated. Other devices were signed out.', 'success');
      onClose();
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Change password">
      <form className="form" onSubmit={handleSubmit} noValidate>
        <p className="muted password-intro">
          Enter your current password, then choose a new one. We will sign out any other devices still
          logged in.
        </p>

        <div className="field">
          <label htmlFor="p-current">Current password</label>
          <div className="input-suffix">
            <input
              id="p-current"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              maxLength={LIMITS.passwordMax}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="suffix-btn"
              onClick={() => setShowPassword((current) => !current)}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="p-new">New password</label>
          <input
            id="p-new"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            maxLength={LIMITS.passwordMax}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            aria-describedby="p-new-hint"
            required
          />
          <p id="p-new-hint" className="hint">
            At least {LIMITS.passwordMin} characters.
          </p>
        </div>

        <div className="field">
          <label htmlFor="p-confirm">Confirm new password</label>
          <input
            id="p-confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            maxLength={LIMITS.passwordMax}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              key="password-error"
              className="form-error"
              role="alert"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <Button type="submit" block disabled={pending}>
          {pending ? 'Updating password...' : 'Update password'}
        </Button>
      </form>

      <div className="password-alt">
        <span className="muted">Forgot your current password?</span>
        <button type="button" className="link-btn" onClick={handleEmailReset} disabled={sendingReset}>
          {sendingReset ? 'Sending...' : 'Email me a reset link'}
        </button>
      </div>
    </Modal>
  );
}
