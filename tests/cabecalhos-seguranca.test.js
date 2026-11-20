// A política de segurança (vercel.json) libera os <script> embutidos das
// páginas pelo hash SHA-256 do conteúdo. Se um script embutido mudar, o hash
// muda e o navegador passa a bloqueá-lo em produção: este teste avisa antes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { globSync } from 'glob';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
// A página de arquitetura C4 tem regra própria (precisa falar com os
// renderizadores PlantUML); todas as outras usam a regra geral.
const FONTE_GERAL = '/((?!docs/c4-architecture/).*)';
const FONTE_C4 = '/docs/c4-architecture/(.*)';
const regra = (fonte) => config.headers.find((h) => h.source === fonte).headers;
const valorEm = (fonte, nome) => regra(fonte).find((h) => h.key === nome)?.value ?? '';
const geral = regra(FONTE_GERAL);
const valor = (nome) => valorEm(FONTE_GERAL, nome);
const csp = valor('Content-Security-Policy');
const cspDaPagina = (pagina) => valorEm(pagina.startsWith('docs/c4-architecture/') ? FONTE_C4 : FONTE_GERAL, 'Content-Security-Policy');

test('todo <script> embutido das páginas está liberado na CSP', () => {
  const paginas = globSync('{*.html,app/**/*.html,docs/c4-architecture/index.html}');
  const faltando = [];
  for (const pagina of paginas) {
    const html = readFileSync(pagina, 'utf8');
    for (const [, atributos, conteudo] of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/type="module"/.test(atributos) && !conteudo.trim()) continue;
      const hash = `'sha256-${createHash('sha256').update(conteudo).digest('base64')}'`;
      if (!cspDaPagina(pagina).includes(hash)) faltando.push(`${pagina}: ${hash}`);
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

test('CSP da página C4 só abre a conexão com os renderizadores', () => {
  const c4 = valorEm(FONTE_C4, 'Content-Security-Policy');
  assert.match(c4, /object-src 'none'/);
  assert.match(c4, /frame-ancestors 'none'/);
  assert.doesNotMatch(c4, /script-src[^;]*'unsafe-(inline|eval)'/);
  assert.match(c4, /connect-src 'self' https:\/\/www\.plantuml\.com https:\/\/kroki\.io;/);
  assert.equal(valorEm(FONTE_C4, 'X-Frame-Options'), 'DENY');
});
