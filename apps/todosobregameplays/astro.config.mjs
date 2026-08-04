import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  output: 'static',
  integrations: [react()],
  build: { assets: 'assets' },
  vite: {
    envDir: path.resolve(appDir, '../../'),
    server: {
      proxy: {
        '/hcgi/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (urlPath) => urlPath.replace(/^\/hcgi\/api/, ''),
        },
      },
    },
  },
});
