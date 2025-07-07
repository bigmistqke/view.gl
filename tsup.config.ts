// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/tag.ts'],
  format: ['esm'], // or just 'esm' or 'cjs' depending on your needs
  splitting: false,
  sourcemap: true,
  minify: true,
  clean: true,
  dts: true, // generates .d.ts files
})
