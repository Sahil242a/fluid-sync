import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // ── Server ──────────────────────────────────────────────
  server: {
    host:     '0.0.0.0',
    port:     5173,
    strictPort: true,
    // Open browser automatically
    open: false,
  },

  // ── Preview Server (for production build testing) ───────
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },

  // ── Build ───────────────────────────────────────────────
  build: {
    // Output directory
    outDir: 'dist',
    
    // Source maps (disable for production)
    sourcemap: false,
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // Remove console.log in prod
        drop_debugger: true,
      },
    },

    // Chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          'react-vendor':   ['react', 'react-dom'],
          'framer-motion':  ['framer-motion'],
          'firebase':       ['firebase/app', 'firebase/auth'],
          'peer':           ['simple-peer'],
          'socket':         ['socket.io-client'],
        },
      },
    },

    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },

  // ── Defines ─────────────────────────────────────────────
  define: {
    // Only process.env - global is handled in index.html
    'process.env': {},
    
    // App version (optional)
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },

  // ── Resolve Aliases ─────────────────────────────────────
  resolve: {
    alias: {
      // Node.js polyfills for browser
      buffer:  'buffer',
      process: 'process/browser',
      util:    'util',
      stream:  'stream-browserify',
      events:  'events',
    },
  },

  // ── Optimization ────────────────────────────────────────
  optimizeDeps: {
    include: [
      'buffer',
      'process',
      'simple-peer',
      'socket.io-client',
    ],
    // Force pre-bundle these
    force: true,
  },
});