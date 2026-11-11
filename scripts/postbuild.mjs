// GitHub Pages has no SPA fallback: a direct request to a client-side route
// such as /winter-confessions/u/someone returns 404 because no file exists at
// that path. Pages serves 404.html for unknown paths, so mirroring index.html
// there lets the app boot and let the router resolve the route.
import { copyFileSync, writeFileSync } from 'node:fs';

copyFileSync('dist/index.html', 'dist/404.html');

// Stop Pages from running Jekyll over the deployed artifact.
writeFileSync('dist/.nojekyll', '');
