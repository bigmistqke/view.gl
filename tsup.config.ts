import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/tag.ts'],
  format: ['esm'],
  splitting: true,
  sourcemap: true,
  minify: false,
  clean: true,
  dts: true,
})
