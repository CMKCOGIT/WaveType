import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decidirAcessoArea,
  decidirPaginaDeAcesso,
  destinoAposLogin,
  redirectInternoSeguro,
  inatividadeExpirada,
  urlDeLogin,
  iniciais,
  LIMITE_INATIVIDADE_MS,
} from '../js/sessao/regras.js';

const ORIGEM = 'https://wavetype.com.br';
const aluno = { id: 'a1', nome: 'Maria Silva', tipo: 'aluno', tipo_definido: true, ativo: true };
const professor = { id: 'p1', nome: 'João Lima', tipo: 'professor', tipo_definido: true, ativo: true };
const incompleto = { id: 'g1', nome: 'Ana', tipo: 'aluno', tipo_definido: false };

// ---------- Telas de acesso (login / cadastro) ----------

test('logado acessando /login vai para a área do papel', () => {
  assert.deepEqual(decidirPaginaDeAcesso({ sessao: 'valida', perfil: aluno, origem: ORIGEM }), {
    acao: 'redirecionar',
    destino: '/app/aluno/index.html',
  });
  assert.equal(decidirPaginaDeAcesso({ sessao: 'valida', perfil: professor, origem: ORIGEM }).destino, '/app/professor/index.html');
});

test('logado acessando /cadastro também é redirecionado; cadastro incompleto fica para concluir', () => {
  assert.equal(decidirPaginaDeAcesso({ sessao: 'valida', perfil: aluno, naConclusaoDoCadastro: true, origem: ORIGEM }).acao, 'redirecionar');
  assert.deepEqual(decidirPaginaDeAcesso({ sessao: 'valida', perfil: incompleto, naConclusaoDoCadastro: true, origem: ORIGEM }), { acao: 'ficar' });
  assert.equal(decidirPaginaDeAcesso({ sessao: 'valida', perfil: incompleto, origem: ORIGEM }).destino, '/cadastro.html?completar=1');
});

test('sessão inválida na tela de login: limpa e mostra o formulário (sem loop)', () => {
  assert.deepEqual(decidirPaginaDeAcesso({ sessao: 'invalida', perfil: null, origem: ORIGEM }), { acao: 'limpar' });
  assert.deepEqual(decidirPaginaDeAcesso({ sessao: 'ausente', origem: ORIGEM }), { acao: 'ficar' });
});

test('pós-login respeita ?redirect= interno da mesma área', () => {
  assert.equal(destinoAposLogin(aluno, '/app/aluno/treinar.html?id=7', ORIGEM), '/app/aluno/treinar.html?id=7');
});

test('pós-login ignora ?redirect= de outra área (aluno não vai para o painel do professor)', () => {
  assert.equal(destinoAposLogin(aluno, '/app/professor/turmas.html', ORIGEM), '/app/aluno/index.html');
});

test('open redirect: só caminhos internos /app/ são aceitos', () => {
  for (const ruim of [
    'https://malicioso.com/app/aluno/',
    '//malicioso.com/app/aluno/',
    '/\\malicioso.com',
    'javascript:alert(1)',
    '/login.html',
    '/app/../login.html',
    '',
    null,
    '/app/aluno/\n',
  ]) {
    assert.equal(redirectInternoSeguro(ruim, ORIGEM), null, String(ruim));
  }
  assert.equal(redirectInternoSeguro('/app/aluno/index.html#x', ORIGEM), '/app/aluno/index.html#x');
});

// ---------- Área logada ----------

test('sem sessão: login com ?redirect= da página', () => {
  const d = decidirAcessoArea({ sessao: 'ausente', papelEsperado: 'aluno', caminhoAtual: '/app/aluno/ranking.html' });
  assert.equal(d.acao, 'login');
  assert.equal(d.destino, '/login.html?redirect=%2Fapp%2Faluno%2Franking.html');
});

test('sessão expirada: derruba e manda ao login com mensagem', () => {
  const d = decidirAcessoArea({ sessao: 'invalida', papelEsperado: 'aluno', caminhoAtual: '/app/aluno/index.html' });
  assert.equal(d.acao, 'derrubar');
  assert.equal(d.motivo, 'expirada');
  assert.match(d.destino, /^\/login\.html\?motivo=expirada/);
});

test('acesso cruzado: aluno no painel do professor vai para a própria área', () => {
  assert.deepEqual(decidirAcessoArea({ sessao: 'valida', perfil: aluno, papelEsperado: 'professor' }), {
    acao: 'redirecionar',
    destino: '/app/aluno/index.html',
  });
  assert.deepEqual(decidirAcessoArea({ sessao: 'valida', perfil: professor, papelEsperado: 'aluno' }), {
    acao: 'redirecionar',
    destino: '/app/professor/index.html',
  });
});

test('papel alterado no servidor: derruba a sessão', () => {
  const d = decidirAcessoArea({ sessao: 'valida', perfil: professor, papelEsperado: 'professor', papelDaSessao: 'aluno' });
  assert.equal(d.acao, 'derrubar');
  assert.equal(d.motivo, 'papel');
});

test('conta desativada: derruba a sessão', () => {
  assert.equal(decidirAcessoArea({ sessao: 'valida', perfil: { ...aluno, ativo: false }, papelEsperado: 'aluno' }).motivo, 'desativada');
});

test('inatividade: aluno é derrubado depois do limite; professor não', () => {
  const agora = 10_000_000;
  const antiga = agora - LIMITE_INATIVIDADE_MS.aluno - 1;
  assert.equal(decidirAcessoArea({ sessao: 'valida', perfil: aluno, papelEsperado: 'aluno', ultimaAtividade: antiga, agora }).motivo, 'inatividade');
  assert.equal(decidirAcessoArea({ sessao: 'valida', perfil: professor, papelEsperado: 'professor', ultimaAtividade: antiga, agora }).acao, 'permitir');
  assert.equal(inatividadeExpirada('aluno', agora - 60_000, agora), false);
  assert.equal(inatividadeExpirada('aluno', null, agora), false);
});

test('acesso permitido no papel certo', () => {
  assert.deepEqual(decidirAcessoArea({ sessao: 'valida', perfil: aluno, papelEsperado: 'aluno', papelDaSessao: 'aluno' }), { acao: 'permitir' });
});

test('utilidades', () => {
  assert.equal(urlDeLogin(), '/login.html');
  assert.equal(iniciais('Maria da Silva Santos'), 'MS');
  assert.equal(iniciais(''), 'WT');
});
