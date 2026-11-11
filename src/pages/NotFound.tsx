import { Button } from '../components/Button';
import { PageTransition } from '../components/PageTransition';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <PageTransition className="center-page">
      <div className="empty-card">
        <span className="empty-icon" aria-hidden="true">
          🌨️
        </span>
        <h1>This page got snowed in</h1>
        <p>The link may be mistyped or the page may have moved. Head back home to find your way.</p>
        <Button to="/">Back to home</Button>
      </div>
    </PageTransition>
  );
}
