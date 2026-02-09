import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/runtime/index.ts',
    'src/system/index.ts',
    'src/types/index.ts'
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: false,
  splitting: false,
  sourcemap: true,
  target: 'node18',
  external: ['react', 'react-dom', '@sker/core', '@sker/prompt-renderer', 'zod']
})
