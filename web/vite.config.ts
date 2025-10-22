import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve'
  const isProd = mode === 'production'

  return {
    plugins: [react()],
    
    // Define global constants (equivalent to webpack.DefinePlugin)
    define: {
      __DEVELOPMENT__: JSON.stringify(isDev),
      __REACT_APP_ADVANCED_SEARCH__: isDev ? 'true' : process.env.REACT_APP_ADVANCED_SEARCH === 'true',
      __API_URL__: JSON.stringify('/api/v1'),
      __API_BETA_URL__: JSON.stringify('/api/v2beta'),
      __NODE_ENV__: JSON.stringify(mode),
      __TEMP_ACTOR_STR__: JSON.stringify('me'),
      __ROLLBAR__: JSON.stringify(isProd),
      __FEEDBACK_FORM_URL__: JSON.stringify('https://forms.gle/f3tTSrZ8wPj3sHTA7'),
      __API_DOCS_URL__: JSON.stringify('https://marquezproject.github.io/marquez/openapi.html')
    },

    // Resolve configuration
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.json'],
      alias: {
        // Add any aliases you might need
        '@': path.resolve(__dirname, './src'),
      }
    },

    // CSS configuration
    css: {
      modules: {
        // CSS modules configuration (equivalent to css-loader options)
        generateScopedName: '[name]__[local]__[hash:base64:5]',
      }
    },

    // Development server configuration
    server: {
      port: 1337,
      open: true,
      proxy: {
        '/api': {
          target: `http://${process.env.MARQUEZ_HOST || 'localhost'}:${process.env.MARQUEZ_PORT || 5000}/`,
          secure: false,
          headers: {
            'X-Bifrost-Authentication': 'developer'
          }
        }
      }
    },

    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          // Ensure elkjs worker file is copied
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'elk-worker.min.js') {
              return 'elk-worker.min.js'
            }
            return 'assets/[name]-[hash][extname]'
          }
        }
      }
    },

    // Optimizations
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'd3',
        'd3-axis',
        'd3-format',
        'd3-scale',
        'd3-selection'
      ]
    },

    // Public directory for static assets
    publicDir: 'public',

    // Preview server (for production builds)
    preview: {
      port: 1337
    }
  }
})