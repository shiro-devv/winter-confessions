import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../components/Button';
import { PageTransition } from '../components/PageTransition';
import { Snowflake } from '../components/Snowflake';
import { messageFromError } from '../db/errors';
import { useAuth } from '../hooks/auth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/toast';
import { supabase } from '../lib/supabase';
import { LIMITS } from '../services/validation';

type Status = 'checking' | 'ready' | 'invalid';

/**
 * Landing page for the password-reset email. The link signs the person in with
 * a short-lived recovery session, so we only show the form when that session
 * exists; otherwise the link was already used or has expired.
 */
export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useDocumentTitle('Choose a new password');

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setStatus(data.session ? 'ready' : 'invalid');
    });

    // The recovery token is read from the URL during startup, so the session
    // may appear slightly after the first render.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setStatus('ready');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);

    if (password !== confirm) {
      setError('Those passwords do not match. Please type them again.');
      return;
    }

    setPending(true);
    try {
      await updatePassword(password);
      toast.show('Your password is updated. You are logged in.', 'success');
      navigate('/inbox', { replace: true });
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <PageTransition className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="auth-icon">
          <Snowflake size={34} />
        </div>
        <h1 className="auth-title">Choose a new password</h1>

        {status === 'checking' && <p className="auth-sub">Checking your reset link...</p>}

        {status === 'invalid' && (
          <div className="form">
            <p className="auth-sub">
              This reset link is invalid or has expired. Request a new one and try again.
            </p>
            <Button to="/auth?mode=reset" block>
              Request a new link
            </Button>
          </div>
        )}

        {status === 'ready' && (
          <>
            <p className="auth-sub">
              Pick a password you have not used before. We will sign out any other devices still logged
              in to your account.
            </p>

            <form className="form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="new-password">New password</label>
                <div className="input-suffix">
                  <input
                    id="new-password"
                    name="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    maxLength={LIMITS.passwordMax}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-describedby="new-password-hint"
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
                <p id="new-password-hint" className="hint">
                  At least {LIMITS.passwordMin} characters.
                </p>
              </div>

              <div className="field">
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  maxLength={LIMITS.passwordMax}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  required
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    key="error"
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
                {pending ? 'Updating password...' : 'Set new password'}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </PageTransition>
  );
}
