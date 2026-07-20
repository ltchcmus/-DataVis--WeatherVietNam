import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: 3000,
    proxy: {
      '/ai': 'http://localhost:8000',
      '/execute': 'http://localhost:8000',
      '/history': 'http://localhost:8000',
      '/conversations': 'http://localhost:8000',
      '/suggestions': 'http://localhost:8000',
      '/logs': 'http://localhost:8000',
      '/data': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    }
  }
})
