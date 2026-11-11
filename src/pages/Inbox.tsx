import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../components/Button';
import { ConfessionCard } from '../components/ConfessionCard';
import { PageTransition } from '../components/PageTransition';
import { messageFromError } from '../db/errors';
import { useAuth } from '../hooks/auth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/toast';
import { supabase } from '../lib/supabase';
import { copyText, profileUrl } from '../lib/share';
import { inboxFor, markAllRead, type Confession } from '../services/confessions';
import { LIMITS } from '../services/validation';

type Filter = 'all' | 'unread' | 'answered';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'answered', label: 'Answered' },
];

const EMPTY_COPY: Record<Filter, { title: string; body: string }> = {
  all: {
    title: 'Your inbox is quiet',
    body: 'No confessions yet. Share your link and the first one will drift in soon.',
  },
  unread: {
    title: 'All caught up',
    body: 'You have read every confession. New ones will show up here.',
  },
  answered: {
    title: 'No replies yet',
    body: 'Reply to a confession and it will appear in this tab.',
  },
};

export default function Inbox() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  useDocumentTitle('Your inbox');

  const userId = user?.id ?? null;
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setBio(user.bio);
  }, [user]);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setConfessions(await inboxFor(userId));
    } catch (caught) {
      toast.show(messageFromError(caught), 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // New confessions appear without a refresh when Realtime is enabled for the table.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`inbox-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'confessions', filter: `recipient_id=eq.${userId}` },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  if (!user) return null;

  const link = profileUrl(user.username);
  const unreadTotal = confessions.filter((confession) => confession.readAt === null).length;
  const visible = confessions.filter((confession) => {
    if (filter === 'unread') return confession.readAt === null;
    if (filter === 'answered') return confession.answer !== null;
    return true;
  });

  const handleCopy = async () => {
    const ok = await copyText(link);
    toast.show(
      ok ? 'Link copied. Paste it in your bio or story.' : 'We could not copy automatically. Select the link and copy it.',
      ok ? 'success' : 'error',
    );
  };

  const handleShare = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Winter Confessions', text: 'Send me an anonymous confession ❄️', url: link });
        return;
      } catch {
        /* The person closed the share sheet. Do nothing. */
        return;
      }
    }
    await handleCopy();
  };

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingProfile) return;
    setProfileError(null);
    setSavingProfile(true);
    try {
      await updateProfile(user.id, { displayName, bio });
      toast.show('Profile saved.', 'success');
    } catch (caught) {
      setProfileError(messageFromError(caught));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead(user.id);
      await load();
      toast.show('Everything is marked as read.', 'success');
    } catch (caught) {
      toast.show(messageFromError(caught), 'error');
    }
  };

  const emptyCopy = EMPTY_COPY[filter];

  if (loading) {
    return (
      <PageTransition className="inbox-page">
        <div className="inbox-head">
          <div>
            <h1>Your inbox</h1>
            <p className="muted">Loading your confessions...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="inbox-page">
      <div className="inbox-head">
        <div>
          <h1>Your inbox</h1>
          <p className="muted">
            {confessions.length} {confessions.length === 1 ? 'confession' : 'confessions'} · {unreadTotal} unread
          </p>
        </div>
        {unreadTotal > 0 && (
          <Button variant="ghost" onClick={handleMarkAll}>
            Mark all as read
          </Button>
        )}
      </div>

      <div className="inbox-grid">
        <section aria-label="Confessions">
          <div className="tabs tabs-small" role="tablist" aria-label="Filter confessions">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={`tab ${filter === item.id ? 'tab-active' : ''}`}
                onClick={() => setFilter(item.id)}
              >
                {filter === item.id && <motion.span layoutId="inbox-tab" className="tab-pill" />}
                <span className="tab-label">{item.label}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <motion.div
              key={filter}
              className="empty-card empty-inline"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="empty-icon" aria-hidden="true">
                ❄️
              </span>
              <h2>{emptyCopy.title}</h2>
              <p>{emptyCopy.body}</p>
              {filter === 'all' && <Button onClick={handleCopy}>Copy your link</Button>}
            </motion.div>
          ) : (
            <ul className="confession-list">
              <AnimatePresence initial={false}>
                {visible.map((confession) => (
                  <ConfessionCard
                    key={confession.id}
                    confession={confession}
                    onChanged={() => {
                      void load();
                    }}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <aside className="inbox-side" aria-label="Your link and profile">
          <motion.div
            className="side-card side-card-blue"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <h2>Your link</h2>
            <p className="link-box">{link}</p>
            <div className="row">
              <Button variant="light" onClick={handleCopy}>
                Copy link
              </Button>
              <Button variant="ghost-light" onClick={handleShare}>
                Share
              </Button>
            </div>
            <p className="side-small">
              <Link to={`/u/${user.username}`}>Preview your public page</Link>
            </p>
          </motion.div>

          <motion.form
            className="side-card"
            onSubmit={handleProfileSave}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            noValidate
          >
            <h2>Your profile</h2>
            <div className="field">
              <label htmlFor="p-name">Display name</label>
              <input
                id="p-name"
                type="text"
                maxLength={LIMITS.displayNameMax}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="p-bio">Short bio</label>
              <input
                id="p-bio"
                type="text"
                maxLength={LIMITS.bioMax}
                placeholder="Shown on your public page"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            </div>
            {profileError && (
              <p className="form-error" role="alert">
                {profileError}
              </p>
            )}
            <Button type="submit" block disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save profile'}
            </Button>
          </motion.form>
        </aside>
      </div>
    </PageTransition>
  );
}
