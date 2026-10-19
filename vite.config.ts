import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves the project from /room-planner/; keep dev at the root.
  // Preview also runs in production mode, so it can serve the built base path.
  base: mode === 'production' ? '/room-planner/' : '/',
  plugins: [react()],
}));
