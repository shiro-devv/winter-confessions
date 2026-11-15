import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { LEGAL } from '../lib/legal';
import { PageTransition } from './PageTransition';

interface LegalPageProps {
  title: string;
  intro: string;
  children: ReactNode;
}

/** Shared shell for the Terms, Privacy, and Cookie pages. */
export function LegalPage({ title, intro, children }: LegalPageProps) {
  useDocumentTitle(title);

  return (
    <PageTransition className="legal-page">
      <article className="legal">
        <header className="legal-head">
          <h1>{title}</h1>
          <p className="muted">
            Effective {LEGAL.effectiveDate} · Last updated {LEGAL.lastUpdated}
          </p>
          <p className="legal-intro">{intro}</p>
        </header>

        <div className="legal-body">{children}</div>

        <footer className="legal-foot">
          <p className="muted">
            Questions about this page? Email{' '}
            <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. See also our{' '}
            <Link to="/terms">Terms of Service</Link>, <Link to="/privacy">Privacy Policy</Link> and{' '}
            <Link to="/cookies">Cookie &amp; Storage Policy</Link>.
          </p>
        </footer>
      </article>
    </PageTransition>
  );
}
