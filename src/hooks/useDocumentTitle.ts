import { useEffect } from 'react';

const BASE_TITLE = 'Winter Confessions';

/** Sets the browser tab title while the calling page is mounted. */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
}
