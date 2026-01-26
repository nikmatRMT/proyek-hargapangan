// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths' // boleh dipakai, tapi alias tetap wajib

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(), // optional: biar path dari tsconfig juga kebaca
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // <-- INI KUNCI: "@/..." => "src/..."
    },
  },
  server: {
    host: true,
    port: 5173,
    // kalau nanti pakai Cloudflare Tunnel, boleh aktifkan baris di bawah:
    // allowedHosts: ['.trycloudflare.com', 'headphones-gmt-render-load.trycloudflare.com'],
    hmr: { host: 'localhost', protocol: 'ws' },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: { include: ['exceljs'] },
  build: { commonjsOptions: { transformMixedEsModules: true } },
})
