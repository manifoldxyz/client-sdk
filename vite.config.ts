import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dts from 'vite-plugin-dts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ManifoldClientSDK',
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      // Mark dependencies as external so they're not bundled
      external: [
        'ethers',
        '@manifoldxyz/manifold-provider-client',
        '@manifoldxyz/studio-apps-client'
      ],
      output: {
        preserveModules: false,
        exports: 'named',
        // Provide globals for UMD builds (if needed in future)
        globals: {
          'ethers': 'ethers'
        }
      }
    },
    sourcemap: true,
    minify: false,
    // Ensure target supports modern features used by ethers
    target: 'es2020'
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      // Exclude external dependencies from type declarations
      exclude: [
        'node_modules/**',
        'dist/**'
      ]
    })
  ],
  // Define global constants for better tree-shaking
  define: {
    // Remove debug code in production builds
    '__DEV__': JSON.stringify(process.env.NODE_ENV === 'development'),
    // SDK version for cache keys and debugging
    '__SDK_VERSION__': JSON.stringify(process.env.npm_package_version || '0.1.0')
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'ethers'
    ],
    exclude: [
      '@manifoldxyz/manifold-provider-client',
      '@manifoldxyz/studio-apps-client'
    ]
  }
});