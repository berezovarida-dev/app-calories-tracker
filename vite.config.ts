import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.join(__dirname, '.certs', 'ws-demo.dobryakov.net.key')),
      cert: fs.readFileSync(path.join(__dirname, '.certs', 'ws-demo.dobryakov.net.crt')),
    },
    port: 8192,
    host: '0.0.0.0', // слушать на всех интерфейсах
    allowedHosts: ['ws-demo.dobryakov.net', 'n8n.dobryakov.net'],
  },
})
