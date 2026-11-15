import { Link } from 'react-router-dom';
import { LegalPage } from '../components/LegalPage';
import { LEGAL } from '../lib/legal';

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={`These Terms are the agreement between you and ${LEGAL.operator} for using ${LEGAL.siteName}. Please read them before you create an account or send a confession.`}
    >
      <section>
        <h2>1. Who we are</h2>
        <p>
          {LEGAL.siteName} (the "Service") is a small, free project run by {LEGAL.operator} ("we",
          "us", "our"). It lets you claim a username, share a link, and receive anonymous messages
          ("confessions") from people who use that link. You can reach us at{' '}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
        <p>
          By creating an account, sending a confession, or otherwise using the Service, you agree to
          these Terms. If you do not agree, do not use the Service.
        </p>
      </section>

      <section>
        <h2>2. Who can use it</h2>
        <p>
          You must be at least {LEGAL.minimumAge} years old to use the Service. If you are below the
          age at which you can agree to online services where you live (for example 16 in parts of
          the EU), use the Service only with a parent or guardian's permission.
        </p>
        <p>
          Do not use the Service if you have been banned from it, or if the law where you live does
          not allow you to.
        </p>
      </section>

      <section>
        <h2>3. Your account</h2>
        <ul>
          <li>Give accurate information and keep it up to date.</li>
          <li>
            Keep your password private. You are responsible for activity that happens under your
            account, so tell us right away if you think someone else has access to it.
          </li>
          <li>
            Your username and the display name and bio you set are public. Do not impersonate
            another person or present yourself as us.
          </li>
          <li>One account per person. Do not create accounts to evade a ban or a rate limit.</li>
        </ul>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>harass, threaten, stalk, defame, bully, or harm anyone;</li>
          <li>
            post anything illegal, hateful, sexually explicit involving minors, violent, or that
            reveals someone's private information without their consent (doxxing);
          </li>
          <li>spam, advertise, phish, distribute malware, or run scams;</li>
          <li>
            break the law, violate someone's rights, or send content you do not have the right to
            send;
          </li>
          <li>
            scrape, overload, probe, or disrupt the Service, or try to bypass its security,
            authentication, or rate limits;
          </li>
          <li>copy, resell, or misrepresent the Service as your own.</li>
        </ul>
        <p>
          The Service is not for emergencies or for reporting crimes. If you or someone else is in
          danger, contact the appropriate emergency services.
        </p>
      </section>

      <section>
        <h2>5. Your content</h2>
        <p>
          You keep ownership of the confessions, replies, and profile text you create. By posting
          them, you give us a worldwide, non-exclusive, royalty-free licence to host, store, display,
          and process that content only as needed to run and improve the Service. This licence ends
          when you delete the content, except for copies kept in backups or as the law requires.
        </p>
        <p>
          You are responsible for what you send, and you confirm you have the right to send it. We do
          not endorse any confession or reply, and we do not verify that they are true.
        </p>
      </section>

      <section>
        <h2>6. Anonymity has limits</h2>
        <p>
          Recipients are not shown who sent a confession, and the Service is built to keep senders
          anonymous. That said, anonymity is not a guarantee. We may keep limited technical data (such
          as a random per-browser id), and we may access or disclose content if we are legally
          required to, if it is necessary to protect someone's safety or our legal rights, or to
          enforce these Terms.
        </p>
        <p>
          Do not send anything you would not want to be seen or disclosed. Never send passwords,
          financial details, or other sensitive information.
        </p>
      </section>

      <section>
        <h2>7. Moderation and removal</h2>
        <p>
          We are not obliged to monitor the Service, but we may review, hide, or delete any content,
          and suspend or close any account, that we believe breaks these Terms or the law. To report
          something, email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </section>

      <section>
        <h2>8. Third-party services</h2>
        <p>
          The Service relies on other companies to run. Supabase provides accounts and the database,
          GitHub Pages hosts the site, Google Fonts serves the fonts, and GoatCounter provides
          optional analytics. Their own terms and privacy policies apply to their parts, and we are
          not responsible for them. See the <Link to="/privacy">Privacy Policy</Link> for the full
          list and what each one sees.
        </p>
      </section>

      <section>
        <h2>9. Availability and changes</h2>
        <p>
          The Service is free and provided as-is. We may add, change, or remove features, and we may
          suspend or shut the Service down at any time. We do not promise any level of uptime, and we
          do not currently offer a way to export your data, so keep your own copy of anything you
          care about.
        </p>
      </section>

      <section>
        <h2>10. Disclaimers</h2>
        <p>
          To the fullest extent allowed by law, the Service is provided "as is" and "as available",
          without warranties of any kind, whether express or implied, including fitness for a
          particular purpose, accuracy, and non-infringement. Confessions and replies are written by
          users, not by us, and may be untrue, upsetting, or harmful. We do not provide legal,
          medical, or other professional advice.
        </p>
      </section>

      <section>
        <h2>11. Limitation of liability</h2>
        <p>
          To the fullest extent allowed by law, we will not be liable for any indirect, incidental,
          special, consequential, or punitive damages, or for any loss of data, profits, or goodwill,
          arising out of or relating to your use of the Service. Our total liability for any claim
          relating to the Service is limited to the greater of the amount you paid us in the twelve
          months before the claim (which is zero for a free service) or 10 US dollars.
        </p>
        <p>
          Nothing in these Terms limits liability that cannot be limited by law, including liability
          for death or personal injury caused by our negligence, or for fraud.
        </p>
      </section>

      <section>
        <h2>12. Indemnity</h2>
        <p>
          You agree to indemnify and hold harmless {LEGAL.operator} from any claim, loss, or expense
          (including reasonable legal fees) arising from your content, your use or misuse of the
          Service, or your breach of these Terms or of someone else's rights.
        </p>
      </section>

      <section>
        <h2>13. Suspension and termination</h2>
        <p>
          You may stop using the Service at any time and ask us to close your account. We may suspend
          or terminate your access if you break these Terms or the law. Sections that by their nature
          should survive termination — including content licences already granted, disclaimers,
          liability limits, indemnity, and governing law — will continue to apply.
        </p>
      </section>

      <section>
        <h2>14. Governing law and disputes</h2>
        <p>
          These Terms are governed by the laws of the country in which the operator lives, without
          regard to its conflict-of-law rules. Nothing here removes rights you have under the
          mandatory laws of the country where you live:
        </p>
        <ul>
          <li>
            If you live in the EU/EEA or the UK, you keep the protections of EU/UK consumer and
            data-protection law, and you may bring proceedings in your local courts.
          </li>
          <li>
            If you live in the Philippines, you keep the protections of the Data Privacy Act of 2012
            (RA 10173) and the Consumer Act, and you may complain to the National Privacy Commission.
          </li>
          <li>
            If you live in the United States, nothing here waives rights that cannot be waived under
            applicable state law.
          </li>
        </ul>
      </section>

      <section>
        <h2>15. Changes to these Terms</h2>
        <p>
          We may update these Terms. When we do, we change the "last updated" date at the top, and we
          will note material changes on the site. Continuing to use the Service after a change means
          you accept the new Terms.
        </p>
      </section>

      <section>
        <h2>16. Contact</h2>
        <p>
          Questions, reports, or notices about these Terms go to{' '}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
