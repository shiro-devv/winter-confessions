import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../components/Button';
import { LinkQrDialog } from '../components/LinkQrDialog';
import { PageTransition } from '../components/PageTransition';
import { messageFromError } from '../db/errors';
import { useAuth } from '../hooks/auth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/toast';
import { copyText, profileUrl } from '../lib/share';
import { LIMITS } from '../services/validation';

export default function Profile() {
  const { user, updateProfile, changePassword } = useAuth();
  const toast = useToast();
  useDocumentTitle('Your profile');

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setBio(user.bio);
  }, [user]);

  if (!user) return null;

  const link = profileUrl(user.username);

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

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingPassword) return;
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('Those new passwords do not match. Please type them again.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.show('Password updated. Other devices were signed out.', 'success');
    } catch (caught) {
      setPasswordError(messageFromError(caught));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <PageTransition className="profile-page">
      <div className="inbox-head">
        <div>
          <h1>Your profile</h1>
          <p className="muted">Your share link and how you appear to visitors.</p>
        </div>
        <Button variant="ghost" to="/inbox">
          Back to inbox
        </Button>
      </div>

      <div className="profile-grid">
        <motion.div
          className="side-card side-card-blue"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
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
            <Button variant="ghost-light" onClick={() => setQrOpen(true)}>
              QR code
            </Button>
          </div>
          <p className="side-small">
            <Link to={`/u/${user.username}`}>Preview your public page</Link>
          </p>
        </motion.div>

        <motion.form
          className="side-card"
          onSubmit={handleProfileSave}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
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
      </div>

      <motion.form
        className="side-card password-card"
        onSubmit={handlePasswordChange}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        noValidate
      >
        <h2>Change password</h2>
        <p className="muted">
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
          {passwordError && (
            <motion.p
              key="password-error"
              className="form-error"
              role="alert"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {passwordError}
            </motion.p>
          )}
        </AnimatePresence>
        <Button type="submit" block disabled={savingPassword}>
          {savingPassword ? 'Updating password...' : 'Update password'}
        </Button>
      </motion.form>

      <LinkQrDialog open={qrOpen} onClose={() => setQrOpen(false)} username={user.username} url={link} />
    </PageTransition>
  );
}
