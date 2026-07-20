import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-512.png'],
      manifest: {
        name: 'FinTrack AI 財務管家',
        short_name: 'FinTrack',
        description: 'FinTrack AI 財務管家',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#F5F0E3',
        theme_color: '#F5F0E3',
        // 注意：icon 路徑不能寫死開頭的 "/"（絕對路徑會指向網域根目錄，
        // GitHub Pages 專案頁面部署在子路徑下會 404，導致安裝後的 manifest 失效、開起來一片空白）
        icons: [
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  // 關鍵設定：使用相對路徑 './'，這樣無論部署在 GitHub Pages 的哪一層目錄都能正常讀取資源
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: false
  },
  server: {
    port: Number(process.env.PORT) || 3000,
    open: true
  }
});
