import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node18',
  banner: {
    js: '#!/usr/bin/env node'
  },
  external: ['node-winautomation'],
  esbuildOptions(options) {
    options.platform = 'node'
  }
})
