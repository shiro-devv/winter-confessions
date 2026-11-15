import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Adds a Content Security Policy to the production HTML.
 *
 * GitHub Pages cannot send custom response headers, so the policy has to
 * travel as a `<meta http-equiv>` tag. It is injected at build time only, so
 * the Vite dev server's inline HMR scripts keep working during development.
 * `frame-ancestors` and `report-uri` are ignored in a meta tag; only a real
 * response header could set those.
 */
function securityMeta(): Plugin {
  let supabaseOrigin = '';

  return {
    name: 'wc-security-meta',
    apply: 'build',
    configResolved(config) {
      const url = config.env.VITE_SUPABASE_URL;
      if (typeof url === 'string' && url.length > 0) {
        try {
          supabaseOrigin = new URL(url).origin;
        } catch {
          supabaseOrigin = '';
        }
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const connect = supabaseOrigin || 'https://*.supabase.co';
        const socket = supabaseOrigin ? supabaseOrigin.replace(/^https:/, 'wss:') : 'wss://*.supabase.co';
        const csp = [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-src 'none'",
          "form-action 'self'",
          "img-src 'self' data: blob: https://*.goatcounter.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "script-src 'self' https://gc.zgo.at",
          `connect-src 'self' ${connect} ${socket} https://*.goatcounter.com https://fonts.googleapis.com https://fonts.gstatic.com`,
          "manifest-src 'self'",
          "worker-src 'self' blob:",
          'upgrade-insecure-requests',
        ].join('; ');

        return {
          html,
          tags: [
            {
              tag: 'meta',
              attrs: { 'http-equiv': 'Content-Security-Policy', content: csp },
              injectTo: 'head-prepend',
            },
          ],
        };
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), securityMeta()],
  // GitHub Pages serves this project from a subpath, so all asset URLs
  // must be prefixed with the repo name. Without this, the built HTML
  // points at https://shiro-devv.github.io/assets/... which 404s.
  base: '/winter-confessions/',
  server: { port: 5173 },
});
