import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

const DEFAULT_API_URL = 'https://patchpilot-backend-production.up.railway.app'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  const apiUrl = (env.VITE_API_URL || env.VITE_API_BASE_URL || DEFAULT_API_URL)
    .trim()
    .replace(/\/$/, '')
    .replace(/\/api\/v1$/, '')
  const proxy = {
    '/api': {
      target: apiUrl,
      changeOrigin: true,
      secure: true,
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 4731,
      strictPort: true,
      allowedHosts: true,
      proxy,
    },
    preview: {
      host: '0.0.0.0',
      port: 4731,
      strictPort: true,
      allowedHosts: true,
      proxy,
    },
  }
})
