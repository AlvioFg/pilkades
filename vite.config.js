import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // base relatif supaya build statis bisa dibuka dari subfolder mana pun
  // (diserahkan lewat USB stick, atau di-host di path non-root)
  base: './',
  plugins: [react(), tailwindcss()],
})
