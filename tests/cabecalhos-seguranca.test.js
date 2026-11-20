// A política de segurança (vercel.json) libera os <script> embutidos das
// páginas pelo hash SHA-256 do conteúdo. Se um script embutido mudar, o hash
// muda e o navegador passa a bloqueá-lo em produção: este teste avisa antes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { globSync } from 'glob';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const geral = config.headers.find((h) => h.source === '/(.*)').headers;
const valor = (nome) => geral.find((h) => h.key === nome)?.value ?? '';
const csp = valor('Content-Security-Policy');

test('todo <script> embutido das páginas está liberado na CSP', () => {
  const paginas = globSync('{*.html,app/**/*.html,docs/c4-architecture/index.html}');
  const faltando = [];
  for (const pagina of paginas) {
    const html = readFileSync(pagina, 'utf8');
    for (const [, atributos, conteudo] of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/type="module"/.test(atributos) && !conteudo.trim()) continue;
      const hash = `'sha256-${createHash('sha256').update(conteudo).digest('base64')}'`;
      if (!csp.includes(hash)) faltando.push(`${pagina}: ${hash}`);
    }
  }
  assert.deepEqual(faltando, [], 'Atualize script-src no vercel.json com estes hashes');
});

test('CSP bloqueia o essencial', () => {
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-(inline|eval)'/);
  assert.equal(valor('X-Content-Type-Options'), 'nosniff');
  assert.equal(valor('X-Frame-Options'), 'DENY');
});
