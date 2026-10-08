import { defineConfig } from 'vite';
import { resolve } from 'path';
import { globSync } from 'glob';

// Site multi-página "cru": cada .html vira uma entrada de build.
// Isso é o que permite process.env virar import.meta.env de forma segura
// (só as variáveis com prefixo VITE_ entram no bundle final).
const paginas = globSync('{*.html,app/**/*.html}').reduce((entradas, arquivo) => {
  const nome = arquivo.replace(/\.html$/, '').replace(/\//g, '_');
  entradas[nome] = resolve(__dirname, arquivo);
  return entradas;
}, {});

export default defineConfig({
  build: {
    rollupOptions: { input: paginas },
  },
});
