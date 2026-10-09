import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const production = mode === 'production';
    return {
        plugins: [
            {
                name: 'telegram-react-jsx-in-js',
                enforce: 'pre',
                async transform(code, id) {
                    if (!/[/\\]src[/\\].*\.js$/.test(id)) return null;
                    return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'transform' });
                },
            },
            react({ jsxRuntime: 'classic' }),
            svgr(),
            nodePolyfills({ globals: { Buffer: true, global: true, process: true }, protocolImports: true }),
            VitePWA({
                strategies: 'injectManifest', srcDir: 'src', filename: 'service-worker.js', injectRegister: false,
                injectManifest: {
                    globPatterns: ['**/*.{html,js,css,json,ico,png,jpg,mp3}'],
                    globIgnores: ['**/*.worker.js', '**/*.wasm', '**/*.mem', '**/tdweb.js'],
                    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
                },
                manifest: false,
            }),
        ],
        resolve: { alias: { recompose: path.resolve(__dirname, 'src/Utils/compose.js') } },
        define: {
            'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
            'process.env.PUBLIC_URL': JSON.stringify(env.PUBLIC_URL || ''),
            'process.env.REACT_APP_TELEGRAM_API_ID': JSON.stringify(env.REACT_APP_TELEGRAM_API_ID || env.VITE_TELEGRAM_API_ID || ''),
            'process.env.REACT_APP_TELEGRAM_API_HASH': JSON.stringify(env.REACT_APP_TELEGRAM_API_HASH || env.VITE_TELEGRAM_API_HASH || ''),
            'process.env.REACT_APP_DEFAULT_PHONE': JSON.stringify(env.REACT_APP_DEFAULT_PHONE || env.VITE_DEFAULT_PHONE || ''),
            'process.env.REACT_APP_COMMUNITY_ADS_URL': JSON.stringify(env.REACT_APP_COMMUNITY_ADS_URL || env.VITE_COMMUNITY_ADS_URL || ''),
        },
        build: { outDir: 'build', emptyOutDir: true, sourcemap: env.GENERATE_SOURCEMAP === 'true', target: 'es2020', chunkSizeWarningLimit: 1200 },
        worker: { format: 'es' },
        test: { setupFiles: ['./src/test/setup.js'] },
        optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
    };
});
