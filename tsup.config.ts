import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/tag.ts'],
  format: ['esm'],
  splitting: false,
  sourcemap: true,
  minify: false,
  clean: true,
  dts: true,
})
