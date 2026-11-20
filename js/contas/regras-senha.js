// js/contas/regras-senha.js
// Regras únicas da senha criada pela própria pessoa (cadastro, conclusão do
// cadastro com Google, perfil e redefinição). A lista marcada enquanto se
// digita (js/ui/campos-senha.js) e a validação no envio (js/auth.js) leem
// daqui, para nunca ficarem diferentes.

// "Especial" é qualquer símbolo ou pontuação: não conta letra (com ou sem
// acento), número nem espaço.
const ESPECIAL = /[^\p{L}\p{N}\s]/u;

export const REGRAS_SENHA = [
  { id: 'tamanho', texto: '8 ou mais caracteres', ok: (s) => s.length >= 8 },
  { id: 'letra', texto: 'pelo menos uma letra', ok: (s) => /\p{L}/u.test(s) },
  { id: 'numero', texto: 'pelo menos um número', ok: (s) => /[0-9]/.test(s) },
  { id: 'especial', texto: 'pelo menos um caractere especial (!@#$…)', ok: (s) => ESPECIAL.test(s) },
];

export const MENSAGEM_SENHA = 'A senha precisa ter 8+ caracteres, com letra, número e um caractere especial (ex.: ! @ # $ %).';

export const MAXIMO_SENHA = 72;

/** Devolve a mensagem de erro, ou null se a senha atende todas as regras. */
export function validarSenha(senha) {
  const texto = String(senha ?? '');
  if (texto.length > MAXIMO_SENHA) return `A senha pode ter no máximo ${MAXIMO_SENHA} caracteres.`;
  return REGRAS_SENHA.every((r) => r.ok(texto)) ? null : MENSAGEM_SENHA;
}
