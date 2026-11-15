import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
const fileURLToPath = (url: URL) => decodeURIComponent(url.pathname).replace(/^\/([A-Za-z]:)/, '$1');
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)), '@legacy': fileURLToPath(new URL('../crafting-ui', import.meta.url)) } },
  server: { fs: { allow: ['..'] }, proxy: Object.fromEntries(['/assets','/tree-data','/data','/calculation-data.json','/catalog-data.json','/skills-data.json','/tag-data.json','/tooltip-data.json','/buff-data.json','/glossary-data.json','/unique-art.json'].map(path => [path, 'http://127.0.0.1:4321'])) },
  build: { target: 'es2022' },
});
