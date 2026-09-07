import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ base: process.env.PAGES_BUILD === '1' ? '/qna_geo/' : '/', plugins: [react()], build: { sourcemap: false } });
