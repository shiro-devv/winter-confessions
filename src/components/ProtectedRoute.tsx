import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/auth';

/** Sends logged-out visitors to the login screen, then back after they sign in. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for the session check so a refresh does not bounce a logged-in person.
  if (loading) return null;

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?mode=login&next=${next}`} replace />;
  }
  return <>{children}</>;
}
