import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../components/Button';
import { PageTransition } from '../components/PageTransition';
import { Snowflake } from '../components/Snowflake';
import { messageFromError } from '../db/errors';
import { useAuth } from '../hooks/auth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/toast';
import { LIMITS, normalizeUsername } from '../services/validation';

type Mode = 'signup' | 'login';

/** Only allow redirects to pages inside this app. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/inbox';
  return raw;
}

export default function Auth() {
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get('mode') === 'login' ? 'login' : 'signup';
  const next = safeNext(params.get('next'));

  const { user, loading, signUp, logIn, refresh } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  useDocumentTitle(mode === 'signup' ? 'Create your link' : 'Log in');

  // Wait for the session check so we do not flash the form for a logged-in person.
  if (loading) return null;
  if (user) return <Navigate to={next} replace />;

  const switchMode = (target: Mode) => {
    setError(null);
    setConfirmationSent(false);
    const nextParams = new URLSearchParams(params);
    nextParams.set('mode', target);
    setParams(nextParams, { replace: true });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      if (mode === 'signup') {
        const created = await signUp({ username, email, password, displayName });
        if (created.needsConfirmation) {
          setConfirmationSent(true);
          toast.show('Check your inbox to confirm your email.', 'success');
          return;
        }
        await refresh();
        toast.show(`Welcome, @${created.username}! Your link is ready.`, 'success');
      } else {
        const profile = await logIn(email, password);
        await refresh();
        toast.show(`Welcome back, @${profile.username}.`);
      }
      navigate(next, { replace: true });
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setPending(false);
    }
  };

  const cleaned = normalizeUsername(username);
  const host = window.location.host;

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
        <h1 className="auth-title">{mode === 'signup' ? 'Create your confession link' : 'Welcome back'}</h1>
        <p className="auth-sub">
          {mode === 'signup'
            ? 'Pick a username and add an email. The username becomes the link your friends use to write to you.'
            : 'Log in with the email you signed up with.'}
        </p>

        <div className="tabs" role="tablist" aria-label="Account">
          {(['signup', 'login'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={mode === tab}
              className={`tab ${mode === tab ? 'tab-active' : ''}`}
              onClick={() => switchMode(tab)}
            >
              {mode === tab && <motion.span layoutId="auth-tab" className="tab-pill" />}
              <span className="tab-label">{tab === 'signup' ? 'Create account' : 'Log in'}</span>
            </button>
          ))}
        </div>

        {confirmationSent ? (
          <div className="form">
            <p className="notice">
              We sent a confirmation link to <strong>{email}</strong>. Open it to finish creating{' '}
              <strong>@{cleaned}</strong>.
            </p>
            <Button type="button" block onClick={() => switchMode('login')}>
              Go to log in
            </Button>
          </div>
        ) : (
          <form className="form" onSubmit={handleSubmit} noValidate>
            {mode === 'signup' && (
              <div className="field">
                <label htmlFor="username">Username</label>
                <div className="input-prefix">
                  <span aria-hidden="true">@</span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={LIMITS.usernameMax + 1}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    aria-describedby="username-hint"
                    required
                  />
                </div>
                <p id="username-hint" className="hint">
                  Your link: {host}/u/<strong>{cleaned || 'yourname'}</strong>
                </p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {mode === 'signup' && (
                <motion.div
                  key="display-name"
                  className="field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <label htmlFor="displayName">
                    Display name <span className="optional">(optional)</span>
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    autoComplete="nickname"
                    maxLength={LIMITS.displayNameMax}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-describedby={mode === 'signup' ? 'email-hint' : undefined}
                required
              />
              {mode === 'signup' && (
                <p id="email-hint" className="hint">
                  We only use this to confirm your account and help you recover it.
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-suffix">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  maxLength={LIMITS.passwordMax}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-describedby={mode === 'signup' ? 'password-hint' : undefined}
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
              {mode === 'signup' && (
                <p id="password-hint" className="hint">
                  At least {LIMITS.passwordMin} characters.
                </p>
              )}
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
              {pending
                ? mode === 'signup'
                  ? 'Creating your link...'
                  : 'Logging in...'
                : mode === 'signup'
                  ? 'Create my link'
                  : 'Log in'}
            </Button>
          </form>
        )}
      </motion.div>
    </PageTransition>
  );
}
