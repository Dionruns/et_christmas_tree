import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 允许外部访问
    allowedHosts: [
      'verticillate-overcarelessly-macey.ngrok-free.dev',
      '.ngrok.io',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.loca.lt',
      '.trycloudflare.com'
    ],
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  },
  assetsInclude: ['**/*.hdr'], // 确保 HDR 文件被正确处理为资源
})
