import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyOptions = {
  target: 'http://localhost:8000',
  changeOrigin: true,
  configure: (proxy) => {
    proxy.on('error', (err, req, res) => {
      if (res && !res.headersSent) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend server is offline' }));
      }
    });
  }
};

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: 3000,
    proxy: {
      '/ai': proxyOptions,
      '/execute': proxyOptions,
      '/history': proxyOptions,
      '/conversations': proxyOptions,
      '/suggestions': proxyOptions,
      '/logs': proxyOptions,
      '^/data(/|$)': proxyOptions,
      '/health': proxyOptions,
      '/csv': proxyOptions,     // CSV preset files: /csv/7days, /csv/30days, /csv/90days, /csv/all
    }
  }
})
