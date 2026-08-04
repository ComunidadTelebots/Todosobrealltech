import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { copyFile } from 'node:fs/promises';

const legacyAssets = {
  name: 'gamergitbug-legacy-assets',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await Promise.all([
        copyFile(new URL('./og-image.png', import.meta.url), new URL('og-image.png', dir)),
        copyFile(new URL('./og-image.svg', import.meta.url), new URL('og-image.svg', dir)),
      ]);
    },
  },
};

export default defineConfig({
  output: 'static',
  integrations: [react(), legacyAssets],
});
