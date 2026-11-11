import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to the top whenever the route path changes. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);
  return null;
}
