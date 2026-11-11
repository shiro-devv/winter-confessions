import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this project from a subpath, so all asset URLs
  // must be prefixed with the repo name. Without this, the built HTML
  // points at https://shiro-devv.github.io/assets/... which 404s.
  base: '/winter-confessions/',
  server: { port: 5173 },
});
