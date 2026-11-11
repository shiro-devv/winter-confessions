import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { PageTransition } from '../components/PageTransition';
import { ReactionBar } from '../components/ReactionBar';
import { messageFromError } from '../db/errors';
import { useAuth } from '../hooks/auth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/toast';
import { copyText, profileUrl } from '../lib/share';
import { triggerSnowBurst } from '../lib/snow';
import { formatRelative } from '../lib/time';
import { findUserByUsername, type Profile } from '../services/auth';
import {
  listPrompts,
  publicAnswered,
  sendConfession,
  type Confession,
  type Prompt,
} from '../services/confessions';
import { LIMITS } from '../services/validation';

function pickChips(prompts: Prompt[], count: number): Prompt[] {
  const copy = [...prompts];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export default function Send() {
  const { username = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  // undefined means "still loading"; null means "nobody owns this username".
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [answered, setAnswered] = useState<Confession[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [chips, setChips] = useState<Prompt[]>([]);

  const [body, setBody] = useState('');
  const [promptId, setPromptId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useDocumentTitle(
    profile === undefined
      ? 'Loading profile'
      : profile
        ? `Send a confession to @${profile.username}`
        : 'Profile not found',
  );

  useEffect(() => {
    let active = true;
    setProfile(undefined);
    setAnswered([]);

    findUserByUsername(username)
      .then((found) => {
        if (active) setProfile(found ?? null);
      })
      .catch(() => {
        if (active) setProfile(null);
      });

    return () => {
      active = false;
    };
  }, [username]);

  useEffect(() => {
    let active = true;
    listPrompts()
      .then((items) => {
        if (!active) return;
        setPrompts(items);
        setChips(pickChips(items, 6));
      })
      .catch(() => {
        /* Prompts are optional; the textarea still works without them. */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!profile) {
      setAnswered([]);
      return;
    }

    publicAnswered(profile.id)
      .then((items) => {
        if (active) setAnswered(items);
      })
      .catch(() => {
        if (active) setAnswered([]);
      });

    return () => {
      active = false;
    };
  }, [profile]);

  const selectedPrompt = prompts.find((prompt) => prompt.id === promptId) ?? null;
  const isOwner = Boolean(user && profile && user.id === profile.id);
  const remaining = LIMITS.confessionMax - body.length;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || pending) return;
    setError(null);
    setPending(true);
    try {
      await sendConfession({ recipientUsername: profile.username, body, promptId });
      setSent(true);
      setBody('');
      setPromptId(null);
      triggerSnowBurst();
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setPending(false);
    }
  };

  const handleCopy = async () => {
    if (!profile) return;
    const ok = await copyText(profileUrl(profile.username));
    toast.show(
      ok
        ? 'Link copied. Share it anywhere.'
        : 'We could not copy the link. Copy it from the address bar instead.',
      ok ? 'success' : 'error',
    );
  };

  if (profile === undefined) {
    return (
      <PageTransition className="center-page">
        <div className="empty-card">
          <span className="empty-icon" aria-hidden="true">
            ❄️
          </span>
          <p>Loading @{username || 'profile'}...</p>
        </div>
      </PageTransition>
    );
  }

  if (!profile) {
    return (
      <PageTransition className="center-page">
        <div className="empty-card">
          <span className="empty-icon" aria-hidden="true">
            🧊
          </span>
          <h1>No one is here yet</h1>
          <p>
            We could not find @{username || 'that username'}. Check the spelling, or claim it for yourself.
          </p>
          <Button to="/auth?mode=signup">Claim this username</Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="send-page">
      <div className="send-wrap">
        <motion.section
          className="send-card"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          aria-labelledby="send-title"
        >
          <header className="send-head">
            <Avatar name={profile.displayName} size={56} />
            <div>
              <h1 id="send-title">
                {selectedPrompt ? selectedPrompt.text : 'send me anonymous confessions'}
              </h1>
              <p>
                @{profile.username}
                {profile.bio && <span className="send-bio"> · {profile.bio}</span>}
              </p>
            </div>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            {sent ? (
              <motion.div
                key="sent"
                className="send-done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <motion.span
                  className="send-done-icon"
                  initial={{ rotate: -90, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 0.1 }}
                  aria-hidden="true"
                >
                  ❄️
                </motion.span>
                <h2>Sent!</h2>
                <p>Your confession is drifting into @{profile.username}&apos;s inbox. They will never see your name.</p>
                <div className="send-done-actions">
                  <Button onClick={() => setSent(false)}>Send another</Button>
                  <Button to="/auth?mode=signup" variant="ghost">
                    Get your own link
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                className="send-form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                noValidate
              >
                {isOwner && (
                  <p className="notice">
                    This is your public page. Share it so friends can write to you.{' '}
                    <button type="button" className="link-btn" onClick={handleCopy}>
                      Copy link
                    </button>
                  </p>
                )}

                {chips.length > 0 && (
                  <div className="chips" role="group" aria-label="Need a spark? Pick a prompt">
                    {chips.map((prompt) => (
                      <motion.button
                        key={prompt.id}
                        type="button"
                        className={`chip ${promptId === prompt.id ? 'chip-active' : ''}`}
                        aria-pressed={promptId === prompt.id}
                        onClick={() => setPromptId(promptId === prompt.id ? null : prompt.id)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {prompt.text}
                      </motion.button>
                    ))}
                  </div>
                )}

                <label htmlFor="confession" className="sr-only">
                  Your anonymous confession
                </label>
                <textarea
                  id="confession"
                  className="confession-input"
                  placeholder="Type your confession here..."
                  rows={5}
                  maxLength={LIMITS.confessionMax}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  aria-describedby="confession-count confession-privacy"
                />
                <div className="send-meta">
                  <span id="confession-privacy">🔒 anonymous. They will not see who you are.</span>
                  <span
                    id="confession-count"
                    className={remaining < 40 ? 'count count-low' : 'count'}
                    aria-live="polite"
                  >
                    {remaining}
                  </span>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      key="error"
                      className="form-error"
                      role="alert"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  block
                  disabled={pending || body.trim().length === 0}
                >
                  {pending ? 'Sending...' : 'Send confession'}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.section>

        <section className="answered" aria-labelledby="answered-title">
          <h2 id="answered-title">Answered by @{profile.username}</h2>
          {answered.length === 0 ? (
            <p className="muted">
              Nothing public yet. When @{profile.username} replies to a confession and makes it public, it shows up
              here.
            </p>
          ) : (
            <ul className="answered-list">
              <AnimatePresence initial={false}>
                {answered.map((confession) => (
                  <motion.li
                    key={confession.id}
                    layout
                    className="answered-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <p className="answered-q">{confession.body}</p>
                    <p className="answered-a">{confession.answer}</p>
                    <div className="answered-foot">
                      <span className="muted">{formatRelative(confession.answeredAt ?? confession.createdAt)}</span>
                      <ReactionBar confessionId={confession.id} />
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
          <p className="back-link">
            <Link to="/">Back to Winter Confessions</Link>
          </p>
        </section>
      </div>
    </PageTransition>
  );
}
