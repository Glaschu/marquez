import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json'],
  },
  server: {
    port: 1337,
    open: true,
    proxy: {
      '/api': {
        target: process.env.MARQUEZ_HOST && process.env.MARQUEZ_PORT
          ? `http://${process.env.MARQUEZ_HOST}:${process.env.MARQUEZ_PORT}`
          : 'http://localhost:9000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    __API_URL__: JSON.stringify('/api/v1'),
    __API_BETA_URL__: JSON.stringify('/api/v2beta'),
    __FEEDBACK_FORM_URL__: JSON.stringify('https://forms.gle/f3tTSrZ8wPj3sHTA7'),
    __REACT_APP_ADVANCED_SEARCH__: true,
    __API_DOCS_URL__: JSON.stringify('https://marquezproject.github.io/marquez/openapi.html'),
    __TEMP_ACTOR_STR__: JSON.stringify('me'),
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]__[hash:base64:5]',
    },
  },
})
