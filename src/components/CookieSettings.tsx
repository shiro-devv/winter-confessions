import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConsent } from '../hooks/consent';
import { analyticsAvailable } from '../lib/analytics';
import { Button } from './Button';
import { Modal } from './Modal';

/** The cookie settings dialog, opened from the banner or the footer. */
export function CookieSettings() {
  const { settingsOpen, closeSettings, choices, save } = useConsent();
  const [analytics, setAnalytics] = useState(choices.analytics);
  const analyticsReady = analyticsAvailable();

  // Re-sync the toggle whenever the dialog opens.
  useEffect(() => {
    if (settingsOpen) setAnalytics(choices.analytics);
  }, [settingsOpen, choices.analytics]);

  return (
    <Modal open={settingsOpen} onClose={closeSettings} title="Cookie settings">
      <div className="cookie-settings">
        <p className="muted">
          Choose what this site may store on your device. You can change this any time from the
          footer.
        </p>

        <div className="cookie-row">
          <div className="cookie-row-copy">
            <h3>
              Strictly necessary <span className="cookie-tag">Always on</span>
            </h3>
            <p>
              Keeps you signed in and stops spam and duplicate reactions. Stored in your browser's
              local storage. Turning these off would break the site.
            </p>
          </div>
        </div>

        <div className="cookie-row">
          <div className="cookie-row-copy">
            <h3>
              Analytics <span className="cookie-tag cookie-tag-optional">Optional</span>
            </h3>
            <p>
              {analyticsReady
                ? 'Privacy-friendly, cookieless visit counts (GoatCounter). No personal data and no cross-site tracking.'
                : 'No analytics provider is configured on this deployment, so nothing loads either way.'}
            </p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              aria-label="Allow analytics"
              checked={analytics}
              disabled={!analyticsReady}
              onChange={(event) => setAnalytics(event.target.checked)}
            />
            <span className="switch-track" aria-hidden="true" />
          </label>
        </div>

        <div className="row">
          <Button variant="primary" onClick={() => save({ analytics })}>
            Save choices
          </Button>
          <Button variant="ghost" onClick={() => save({ analytics: false })}>
            Reject non-essential
          </Button>
          <Button variant="ghost" onClick={() => save({ analytics: true })}>
            Accept all
          </Button>
        </div>

        <p className="side-small">
          <Link to="/cookies">Read the cookie policy</Link>
        </p>
      </div>
    </Modal>
  );
}
