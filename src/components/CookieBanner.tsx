import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useConsent } from '../hooks/consent';
import { Button } from './Button';

/**
 * Shown until the visitor makes a choice. Nothing non-essential loads before
 * then, so the banner only has to ask and remember the answer.
 */
export function CookieBanner() {
  const { ready, decided, settingsOpen, acceptAll, rejectNonEssential, openSettings } = useConsent();
  const show = ready && !decided && !settingsOpen;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="cookie-banner"
          role="dialog"
          aria-label="Cookie and storage notice"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
          <div className="cookie-banner-text">
            <p>
              <strong>Cookies and local storage.</strong> We store only what is needed to keep you
              signed in and to stop spam. Optional, privacy-friendly analytics stays off until you
              say yes. Read the <Link to="/cookies">cookie policy</Link>.
            </p>
          </div>
          <div className="cookie-banner-actions">
            <Button variant="ghost" onClick={openSettings}>
              Customize
            </Button>
            <Button variant="secondary" onClick={rejectNonEssential}>
              Reject non-essential
            </Button>
            <Button variant="primary" onClick={acceptAll}>
              Accept all
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
