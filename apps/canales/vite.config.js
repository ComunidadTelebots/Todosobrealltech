import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// App autocontenida: no comparte config ni dependencias con el resto del monorepo.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5175 },
  preview: { host: true, port: 5175 },
})
