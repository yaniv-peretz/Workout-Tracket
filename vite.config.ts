import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Relative base so the same build works on localhost:5173 and on a
// GitHub Pages project URL (https://<user>.github.io/workout/).
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: { port: 5173, host: true }
});
