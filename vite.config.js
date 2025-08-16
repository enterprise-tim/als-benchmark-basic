import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : '/async-node-stats/',
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    // Handle client-side routing in development
    historyApiFallback: true,
    // Serve the results directory in development
    fs: {
      allow: ['..']
    }
  },
  preview: {
    // Handle client-side routing in preview mode
    historyApiFallback: true
  }
}))
