import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Served from https://vishakayadav.github.io/gender-reveal/ (project Pages subpath).
  base: '/gender-reveal/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        play: resolve(__dirname, 'play.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  test: { environment: 'jsdom' },
});
