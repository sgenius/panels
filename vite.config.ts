import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the static build works from any path (root domain,
  // GitHub Pages project subpath, a subfolder, etc.).
  base: './',
  plugins: [react()],
});
