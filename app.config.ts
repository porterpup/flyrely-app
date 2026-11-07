import { defineConfig } from '@tanstack/start/config';
import viteTsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  server: {
    preset: 'node-server',
    // Pinned to Nitro's own fallback date so build behaviour is unchanged
    compatibilityDate: '2024-04-03',
    // Missing static assets 404 instead of returning the SPA HTML (see server/plugins/static-404.ts)
    plugins: ['./server/plugins/static-404.ts'],
  },
  vite: {
    plugins: [viteTsConfigPaths()],
  },
});
