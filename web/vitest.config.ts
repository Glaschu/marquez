import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  test: {
    // Test environment - use happy-dom instead of jsdom to avoid parse5 issues
    environment: 'happy-dom',
    
    // Test file patterns (equivalent to Jest's testRegex)
    include: ['src/**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['src/**/__tests__/**/__snapshots__/**'],
    
    // Setup files (equivalent to Jest's setupFiles and globalSetup)
    setupFiles: ['./setupJest.ts'],
    globalSetup: './globalSetup.ts',
    
    // Enable globals
    globals: true,
  },
  
  resolve: {
    alias: {
      // Handle file mocks
      '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 
        path.resolve(__dirname, 'src/__tests__/__mocks__/fileMock.js'),
      
      // CSS modules mock (identity-obj-proxy equivalent)
      '\\.(css|less)$': 'identity-obj-proxy',
      
      // D3 module mappings
      'd3$': path.resolve(__dirname, 'node_modules/d3/dist/d3.min.js'),
      '^d3-(.*)$': path.resolve(__dirname, 'node_modules/d3-$1/dist/d3-$1.min.js'),

      // Standard aliases
      '@': path.resolve(__dirname, './src'),
    }
  },
  
  // Define global constants
  define: {
    __API_URL__: JSON.stringify('/api/v1'),
    __API_BETA_URL__: JSON.stringify('/api/v2beta'),
    __FEEDBACK_FORM_URL__: JSON.stringify('https://forms.gle/f3tTSrZ8wPj3sHTA7'),
    __REACT_APP_ADVANCED_SEARCH__: true,
    __API_DOCS_URL__: JSON.stringify('https://marquezproject.github.io/marquez/openapi.html'),
    __TEMP_ACTOR_STR__: JSON.stringify('me')
  }
})