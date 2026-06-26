import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/base64-converter-latest/',
  plugins: [react()],
})
