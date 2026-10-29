import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/carvis/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@use "@/styles/vars" as *;',
      },
    },
  },
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.id?.includes('@electric-sql/pglite')) return
        warn(warning)
      },
      output: {
        manualChunks: {
          pglite: ['@electric-sql/pglite'],
          vendor: ['vue', 'vue-router', 'pinia', 'axios', 'zod', 'bcryptjs'],
        },
      },
    },
  },
})
