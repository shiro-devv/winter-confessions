import { Link } from 'react-router-dom';
import { LegalPage } from '../components/LegalPage';
import { useConsent } from '../hooks/consent';
import { LEGAL } from '../lib/legal';
import { Button } from '../components/Button';

export default function Cookies() {
  const { openSettings } = useConsent();

  return (
    <LegalPage
      title="Cookie & Storage Policy"
      intro={`This page lists everything ${LEGAL.siteName} stores on your device, and the third parties that can see your data.`}
    >
      <section>
        <h2>1. What cookies and local storage are</h2>
        <p>
          Cookies are small files a site asks your browser to keep. Local storage is a similar
          browser feature that holds data until you clear it. Both can be used to remember things,
          like keeping you signed in or remembering a setting.
        </p>
      </section>

      <section>
        <h2>2. Our approach</h2>
        <ul>
          <li>We do not use advertising or cross-site tracking cookies.</li>
          <li>
            We use a small amount of local storage that is strictly necessary to run the Service.
          </li>
          <li>
            The only optional item is privacy-friendly analytics, and it stays off until you allow
            it.
          </li>
        </ul>
        <p>
          You can change your choice at any time using the button below or the "Cookie settings"
          link in the footer.
        </p>
        <div className="row">
          <Button variant="secondary" onClick={openSettings}>
            Open cookie settings
          </Button>
        </div>
      </section>

      <section>
        <h2>3. What we store</h2>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Purpose</th>
                <th>Lasts</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>sb-&lt;project-ref&gt;-auth-token</code>
                </td>
                <td>Local storage</td>
                <td>Keeps you signed in. Set by Supabase Auth.</td>
                <td>Until you log out or the session expires</td>
                <td>Strictly necessary</td>
              </tr>
              <tr>
                <td>
                  <code>wc:visitor</code>
                </td>
                <td>Local storage</td>
                <td>
                  A random, anonymous id used to rate-limit sending and stop duplicate reactions.
                </td>
                <td>Until you clear your browser storage</td>
                <td>Strictly necessary</td>
              </tr>
              <tr>
                <td>
                  <code>wc:consent</code>
                </td>
                <td>Local storage</td>
                <td>Remembers the cookie choices you made on this page.</td>
                <td>Until you change it or clear your browser storage</td>
                <td>Strictly necessary</td>
              </tr>
              <tr>
                <td>GoatCounter</td>
                <td>No cookies</td>
                <td>
                  Privacy-friendly visit counts. No personal data, no stored IP address, no
                  cross-site tracking.
                </td>
                <td>Not applicable</td>
                <td>Analytics (only if you opt in)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>4. Third parties</h2>
        <p>
          Some parts of the site are served by other companies, which may see your IP address when
          your browser requests them:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> — accounts and database.
          </li>
          <li>
            <strong>GitHub Pages</strong> — hosts the site.
          </li>
          <li>
            <strong>Google Fonts</strong> — serves the fonts. Google may log your IP address. Google
            Fonts does not set cookies of its own.
          </li>
          <li>
            <strong>GoatCounter</strong> — optional analytics, only after you opt in.
          </li>
        </ul>
        <p>
          See the <Link to="/privacy">Privacy Policy</Link> for what each provider sees.
        </p>
      </section>

      <section>
        <h2>5. Managing your choices</h2>
        <p>
          Use the cookie settings above to allow or reject optional analytics. You can also block or
          clear cookies and local storage in your browser settings, but if you clear the strictly
          necessary items you may be logged out and rate limits may reset.
        </p>
      </section>

      <section>
        <h2>6. Changes and contact</h2>
        <p>
          We may update this page when our storage changes. For any question, email{' '}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
