import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: '页面装修平台',
        short_name: '页面装修',
        description: '可视化移动端页面装修平台',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  define: {
    // 仅使用组合式 API（<script setup>）：关闭 Options API 支持以减小 Vue 运行时体积。
    __VUE_OPTIONS_API__: false,
    // 生产构建关闭 devtools，避免打包 @vue/devtools-api 相关代码。
    __VUE_PROD_DEVTOOLS__: false,
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // 仅将 axios 单独成 chunk（入口 request.ts 即使用，利于长期缓存）。
          // 不为 vue/lucide 单独拆包：Rollup 会把 @vue/shared|reactivity|runtime-core
          // 并入 lucide 所在的 chunk，而入口（App.vue 渲染）静态依赖这些 Vue 内部模块，
          // 结果使含 lucide 的 chunk 被首屏（含 /login）的 modulepreload 急加载。
          // 交由默认分包后，Vue 运行时并入入口，lucide 只留在懒加载的 EditorPage 分片。
          // 也不要把 dompurify/qrcode 并入本 chunk：它们只被懒加载的编辑器路由使用。
          if (/[\\/]node_modules[\\/]axios[\\/]/.test(id)) return 'utils-vendor';
          return undefined;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
});
