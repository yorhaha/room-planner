import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the project from /room-planner/; keep dev at the root.
  base: command === 'build' ? '/room-planner/' : '/',
  plugins: [react()],
}));
