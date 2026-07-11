import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '../../'),
  server: {
    port: 3007,
    proxy: {
      '/hcgi/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (pathName) => pathName.replace(/^\/hcgi\/api/, ''),
      },
    },
  },
});
