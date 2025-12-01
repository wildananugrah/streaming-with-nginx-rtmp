import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT) || 5173,
      host: true,
      allowedHosts: ['live2.mhamzah.id'],
      proxy: {
        '/hls': {
          target: env.VITE_HLS_SERVER || 'http://54.179.134.123:8083',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: parseInt(env.VITE_PORT) || 5173,
      host: true,
      allowedHosts: ['live2.mhamzah.id'],
    },
  }
})
