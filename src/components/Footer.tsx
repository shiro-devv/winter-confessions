import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/auth';
import { useConsent } from '../hooks/consent';
import { Snowflake } from './Snowflake';

export function Footer() {
  const { user, loading } = useAuth();
  const { openSettings } = useConsent();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Snowflake size={22} />
          <span>Winter Confessions</span>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/cookies">Cookies</Link>
          <button type="button" className="footer-link-btn" onClick={openSettings}>
            Cookie settings
          </button>
          {!loading && !user && (
            <>
              <Link to="/auth?mode=signup">Create account</Link>
              <Link to="/auth?mode=login">Log in</Link>
            </>
          )}
        </nav>
      </div>
      <p className="footer-note">
        Made with cold hands and warm hearts. Made by Shiro / Stephen Garcia ❄️
      </p>
    </footer>
  );
}
