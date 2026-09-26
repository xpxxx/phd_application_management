import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: set base to repo name when deploying
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? '/phd_application_management/' : '/',
})
