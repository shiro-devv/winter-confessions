import { Link } from 'react-router-dom';
import { LegalPage } from '../components/LegalPage';
import { LEGAL } from '../lib/legal';

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`This policy explains what ${LEGAL.siteName} collects, why we collect it, and the choices and rights you have. ${LEGAL.operator} is the data controller for the Service.`}
    >
      <section>
        <h2>1. The short version</h2>
        <ul>
          <li>We collect the account details you give us and the confessions and replies you write.</li>
          <li>We use a random, anonymous id in your browser to stop spam and duplicate reactions.</li>
          <li>We do not sell your personal data and we do not run advertising or cross-site tracking.</li>
          <li>
            Analytics are privacy-friendly and cookieless, and they only run if you opt in. See the{' '}
            <Link to="/cookies">Cookie &amp; Storage Policy</Link>.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. What we collect</h2>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>What</th>
                <th>Details</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Account details</td>
                <td>Your username, display name, bio, and email address.</td>
                <td>To create your account, give you a public link, and let you recover access.</td>
              </tr>
              <tr>
                <td>Password</td>
                <td>
                  Handled by Supabase. It is stored salted and hashed, and we never see it as you
                  typed it.
                </td>
                <td>To keep your account secure.</td>
              </tr>
              <tr>
                <td>Confessions and replies</td>
                <td>
                  The message text, your optional reply, timestamps, whether you have read it, and
                  whether a reply is public.
                </td>
                <td>To deliver confessions and show the ones you choose to make public.</td>
              </tr>
              <tr>
                <td>Reactions</td>
                <td>The emoji you pick on a public reply.</td>
                <td>To count and show reactions.</td>
              </tr>
              <tr>
                <td>Anonymous id</td>
                <td>
                  A random value saved in your browser (local storage key <code>wc:visitor</code>).
                  It is not linked to your name.
                </td>
                <td>To rate-limit sending and to stop duplicate reactions.</td>
              </tr>
              <tr>
                <td>Cookie choice</td>
                <td>
                  Your cookie settings (local storage key <code>wc:consent</code>).
                </td>
                <td>To remember what you allowed.</td>
              </tr>
              <tr>
                <td>Technical data</td>
                <td>Your IP address and basic request logs.</td>
                <td>
                  Processed by our hosting and service providers to serve the site and keep it
                  secure.
                </td>
              </tr>
              <tr>
                <td>Analytics (optional)</td>
                <td>
                  Page path, referrer, and coarse device and country information. No cookies and no
                  stored IP address.
                </td>
                <td>To understand roughly how the site is used, only if you opt in.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>3. How we use it and our lawful bases</h2>
        <p>
          Where the EU or UK GDPR applies, we rely on these legal bases:
        </p>
        <ul>
          <li>
            <strong>Performance of a contract</strong> — to create your account, deliver confessions,
            and provide the features you ask for.
          </li>
          <li>
            <strong>Legitimate interests</strong> — to keep the Service safe and working, prevent
            abuse and spam, and enforce our Terms.
          </li>
          <li>
            <strong>Consent</strong> — for optional analytics. You can withdraw this at any time from
            the cookie settings.
          </li>
          <li>
            <strong>Legal obligation</strong> — where we must keep or share data to comply with the
            law.
          </li>
        </ul>
        <p>We do not use your data for automated decisions that have legal effects on you.</p>
      </section>

      <section>
        <h2>4. Cookies and local storage</h2>
        <p>
          We use a small amount of browser storage to run the Service. Most of it is strictly
          necessary, and the only optional item is analytics, which stays off until you allow it. The
          full list is in the <Link to="/cookies">Cookie &amp; Storage Policy</Link>.
        </p>
      </section>

      <section>
        <h2>5. Analytics</h2>
        <p>
          If you opt in, we use {LEGAL.analytics.provider}, a privacy-friendly analytics service. It
          does not use cookies, does not store your IP address, and does not track you across other
          sites. It records things like the page you viewed, the referring site, and coarse device
          and country information. If you do not opt in, no analytics script is loaded at all.
        </p>
      </section>

      <section>
        <h2>6. Who we share it with</h2>
        <p>
          We do not sell your personal data. We share it only with the service providers that make
          the Service work, and only as needed:
        </p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>What it does</th>
                <th>What it sees</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
                    Supabase
                  </a>
                </td>
                <td>Accounts and database hosting.</td>
                <td>Account details, confessions, and reactions.</td>
              </tr>
              <tr>
                <td>
                  <a
                    href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub (GitHub Pages)
                  </a>
                </td>
                <td>Website hosting and delivery.</td>
                <td>IP address and basic request logs.</td>
              </tr>
              <tr>
                <td>
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                    Google (Google Fonts)
                  </a>
                </td>
                <td>Serves the web fonts used on the site.</td>
                <td>IP address and basic browser information.</td>
              </tr>
              <tr>
                <td>
                  <a href="https://www.goatcounter.com/privacy" target="_blank" rel="noopener noreferrer">
                    GoatCounter
                  </a>
                </td>
                <td>Optional, cookieless analytics.</td>
                <td>Page path, referrer, and coarse device and country information.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          We may also disclose data if the law requires it, to protect someone's safety or our legal
          rights, or as part of a sale or transfer of the Service.
        </p>
      </section>

      <section>
        <h2>7. International transfers</h2>
        <p>
          Our providers may store and process your data in countries other than yours, including the
          United States. Where required, those transfers rely on safeguards such as the European
          Commission's Standard Contractual Clauses. You can ask us for more detail.
        </p>
      </section>

      <section>
        <h2>8. How long we keep it</h2>
        <ul>
          <li>Account details are kept while your account is open.</li>
          <li>
            Confessions and replies are kept until you or we delete them, or until your account is
            closed.
          </li>
          <li>Your cookie choice is kept until you change it or clear your browser storage.</li>
          <li>
            Server and provider logs are kept for a short time by each provider, according to their
            own policies.
          </li>
        </ul>
      </section>

      <section>
        <h2>9. Your rights</h2>
        <p>Depending on where you live, you may have some or all of these rights:</p>
        <ul>
          <li>
            <strong>EU/EEA and UK (GDPR):</strong> access, correction, deletion, restriction,
            objection, data portability, and withdrawal of consent. You can also complain to your
            local data-protection authority.
          </li>
          <li>
            <strong>Philippines (Data Privacy Act of 2012):</strong> to be informed, to object, to
            access, to correct, to erase or block, to damages, and to complain to the National
            Privacy Commission.
          </li>
          <li>
            <strong>California (CCPA/CPRA):</strong> to know, delete, correct, and opt out of the sale
            or sharing of personal information, and to not be discriminated against for exercising
            those rights. We do not sell or share personal information as those terms are defined.
          </li>
        </ul>
        <p>
          To exercise any right, email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
          We may need to verify your identity first. You can also delete confessions yourself from
          your inbox.
        </p>
      </section>

      <section>
        <h2>10. Security</h2>
        <p>
          We use reasonable measures to protect your data, including encryption in transit, strict
          access rules on the database, and a Content Security Policy on the site. No method of
          storage or transmission is perfectly secure, so we cannot promise absolute security.
        </p>
      </section>

      <section>
        <h2>11. Children</h2>
        <p>
          The Service is not for children under {LEGAL.minimumAge}. If you believe a child has given
          us personal data, email us and we will delete it.
        </p>
      </section>

      <section>
        <h2>12. Changes to this policy</h2>
        <p>
          We may update this policy. When we do, we change the "last updated" date at the top and
          note material changes on the site.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>
          For any privacy question or request, contact{' '}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
