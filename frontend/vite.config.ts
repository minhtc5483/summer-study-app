import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Dev-server-only proxy target for the local backend — reads from frontend/.env
  // (VITE_API_PROXY_TARGET) instead of a hardcoded port, since the backend's own default dev
  // port isn't guaranteed to always be 3000 (see backend/.env's PORT, and the Docker port
  // clash that pushed production to 3001). Falls back to the previous hardcoded value so
  // nobody has to add a frontend/.env just to keep `npm run dev` working as before.
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': apiProxyTarget,
        '/uploads': apiProxyTarget
      }
    }
  };
})
