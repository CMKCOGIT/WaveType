-- Testes da migração 09 (contas escolares). Rodam num Postgres local com
-- testes/base-supabase-local.sql + schema.sql + todas as migrações.
-- Tudo acontece numa transação desfeita no fim (ROLLBACK).
--   psql -v ON_ERROR_STOP=1 -f supabase/testes/contas_escolares.test.sql
\set QUIET on
begin;

-- Professor e outro professor (o trigger cria os perfis)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'prof@teste.com', '{"nome":"Prof Ana","tipo":"professor"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'outro@teste.com', '{"nome":"Prof Bia","tipo":"professor"}');

create temp table t_ctx (chave text primary key, valor text);
grant all on t_ctx to authenticated, anon;

-- Como o professor A
set local role authenticated;
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
insert into public.turmas (nome, professor_id) values ('5º A', '00000000-0000-0000-0000-0000000000a1');
insert into t_ctx select 'turma', id::text from public.turmas where nome = '5º A';

-- Criar em lote, com colisão de login
insert into t_ctx select 'aluno1', novo_id::text from public.professor_criar_alunos(
  (select valor::bigint from t_ctx where chave = 'turma'),
  '[{"nome":"Maria Silva Santos","login_base":"maria.silva.santos","senha":"gato427"}]');
insert into t_ctx select 'aluno2', novo_id::text || '|' || novo_login from public.professor_criar_alunos(
  (select valor::bigint from t_ctx where chave = 'turma'),
  '[{"nome":"Maria Silva Santos","login_base":"maria.silva.santos","senha":"sapo358"}]');
do $$ begin
  assert (select split_part(valor, '|', 2) from t_ctx where chave = 'aluno2') = 'maria.silva.santos2', 'colisão deve gerar sufixo 2';
  assert (select count(*) from public.matriculas m where m.ativa and m.turma_id = (select valor::bigint from t_ctx where chave='turma')) = 2, 'alunos matriculados';
  assert (select count(*) from public.usuarios where id = (select valor::uuid from t_ctx where chave='aluno1')) = 0, 'RLS: professor não lê o perfil direto';
end $$;

-- Entrada com usuário da escola (anônimo)
reset role;
do $$ begin
  assert (select tipo::text from public.usuarios where id = (select valor::uuid from t_ctx where chave='aluno1')) = 'aluno', 'perfil de aluno criado pelo trigger';
  assert (select email_confirmed_at is not null and encrypted_password like '$2a$10$%' from auth.users where id = (select valor::uuid from t_ctx where chave='aluno1')), 'senha só como hash bcrypt';
end $$;
set local role anon;
do $$ begin
  assert public.login_escolar('Maria.Silva.Santos ', 'gato427') like '%@aluno.wavetype.com.br', 'login certo devolve e-mail';
  assert public.login_escolar('maria.silva.santos', 'errada1') is null, 'senha errada → null';
  assert public.login_escolar('nao.existe', 'gato427') is null, 'usuário inexistente → mesma resposta';
end $$;
-- Bloqueio após 8 falhas
do $$
declare bloqueou boolean := false;
begin
  for i in 1..8 loop perform public.login_escolar('maria.silva.santos2', 'x1x1x1'); end loop;
  begin
    perform public.login_escolar('maria.silva.santos2', 'sapo358');
  exception when others then bloqueou := sqlerrm like 'Muitas tentativas%';
  end;
  assert bloqueou, 'deve bloquear após 8 falhas, mesmo com a senha certa';
end $$;
-- anon não cria alunos
do $$
declare negado boolean := false;
begin
  begin perform public.professor_criar_alunos(1, '[]'); exception when insufficient_privilege then negado := true; end;
  assert negado, 'anon não executa professor_criar_alunos';
end $$;

-- Professor redefine a senha (histórico intacto, bloqueio zerado)
reset role;
set local role authenticated;
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
-- (atividade da turma; o próprio aluno registra o resultado)
reset role;
insert into public.exercicios (titulo, texto_referencia, tempo_limite_seg, criado_por, meta_precisao)
values ('Atividade 1', 'casa mesa', 120, '00000000-0000-0000-0000-0000000000a1', 80);
insert into public.exercicio_turmas (exercicio_id, turma_id)
select (select max(id) from public.exercicios), valor::bigint from t_ctx where chave = 'turma';
set local role authenticated;
select null from set_config('request.jwt.claim.sub', (select valor from t_ctx where chave='aluno1'), true);
insert into public.resultados (aluno_id, exercicio_id, ppm, precisao, acertos, erros, tempo_seg, turma_id)
select auth.uid(), (select max(id) from public.exercicios), 30, 95, 100, 5, 60, (select valor::bigint from t_ctx where chave='turma');
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
do $$ begin
  assert (select count(*) from public.resultados) = 1, 'professor vê o resultado do aluno da turma';
end $$;
do $$ begin
  assert public.professor_redefinir_senha_aluno((select valor::uuid from t_ctx where chave='aluno1'), 'bola592') = 'maria.silva.santos';
  assert public.login_escolar('maria.silva.santos', 'gato427') is null, 'senha antiga não vale';
  assert public.login_escolar('maria.silva.santos', 'bola592') is not null, 'senha nova vale';
  assert (select count(*) from public.contas_escolares) = 2, 'professor vê as contas dos alunos da turma';
end $$;

-- Professor troca o usuário: colisão ganha sufixo, senha e histórico continuam
do $$ begin
  assert public.professor_alterar_login_aluno((select valor::uuid from t_ctx where chave='aluno1'), 'Maria.Silva.Santos2') = 'maria.silva.santos22', 'colisão com outro aluno → sufixo';
  assert public.professor_alterar_login_aluno((select valor::uuid from t_ctx where chave='aluno1'), 'maria.santos') = 'maria.santos';
  assert public.login_escolar('maria.santos', 'bola592') is not null, 'novo usuário entra com a mesma senha';
  assert public.login_escolar('maria.silva.santos', 'bola592') is null, 'usuário antigo deixa de valer';
  assert (select count(*) from public.resultados where aluno_id = (select valor::uuid from t_ctx where chave='aluno1')) = 1, 'histórico intacto';
  assert public.professor_alterar_login_aluno((select valor::uuid from t_ctx where chave='aluno1'), 'maria.silva.santos') = 'maria.silva.santos', 'volta ao original';
end $$;
do $$
declare negado boolean := false;
begin
  begin perform public.professor_alterar_login_aluno((select valor::uuid from t_ctx where chave='aluno1'), 'Maria Silva');
  exception when others then negado := sqlerrm like 'Usuário inválido%'; end;
  assert negado, 'formato inválido é recusado';
end $$;

-- Outro professor não redefine senha de aluno que não é dele
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
do $$
declare negado boolean := false;
begin
  begin perform public.professor_redefinir_senha_aluno((select valor::uuid from t_ctx where chave='aluno1'), 'pato222');
  exception when others then negado := true; end;
  assert negado, 'professor de outra turma não redefine';
  negado := false;
  begin perform public.professor_alterar_login_aluno((select valor::uuid from t_ctx where chave='aluno1'), 'hack.er');
  exception when others then negado := true; end;
  assert negado, 'professor de outra turma não troca o usuário';
  assert (select count(*) from public.contas_escolares) = 0, 'outro professor não vê as contas';
end $$;

-- Aluno: acesso cruzado e transferência
select null from set_config('request.jwt.claim.sub', (select valor from t_ctx where chave='aluno1'), true);
do $$
declare negado boolean := false;
begin
  begin perform public.professor_criar_alunos((select valor::bigint from t_ctx where chave='turma'), '[{"nome":"X Y","login_base":"x.y","senha":"gato427"}]');
  exception when insufficient_privilege then negado := true; end;
  assert negado, 'aluno não cria alunos';
  assert (select login from public.minha_conta_escolar()) = 'maria.silva.santos';
  negado := false;
  begin perform public.transferir_conta_escolar(); exception when others then negado := sqlerrm like 'Antes de transferir%'; end;
  assert negado, 'sem e-mail/Google vinculado, não transfere';
end $$;

-- Simula o vínculo de um e-mail real (o Supabase faria isso após a confirmação)
reset role;
update auth.users set email = 'maria@pessoal.com' where id = (select valor::uuid from t_ctx where chave='aluno1');
set local role authenticated;
select null from set_config('request.jwt.claim.sub', (select valor from t_ctx where chave='aluno1'), true);
do $$ begin
  assert (select email from public.usuarios where id = auth.uid()) = 'maria@pessoal.com', 'e-mail do perfil sincronizado';
  assert public.login_escolar('maria.silva.santos', 'bola592') = 'maria@pessoal.com', 'usuário da escola continua entrando';
  perform public.transferir_conta_escolar();
  assert (select tipo::text from public.usuarios where id = auth.uid()) = 'usuario', 'vira conta pessoal';
  assert (select count(*) from public.resultados where aluno_id = auth.uid()) = 1, 'histórico mantido (mesmo ID)';
end $$;

-- Depois da transferência, o professor perde o acesso aos dados individuais
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
do $$ begin
  assert (select count(*) from public.resultados where aluno_id = (select valor::uuid from t_ctx where chave='aluno1')) = 0, 'professor não vê mais os resultados';
  assert (select count(*) from public.contas_escolares where usuario_id = (select valor::uuid from t_ctx where chave='aluno1')) = 0, 'nem a conta';
  assert not exists (select 1 from public.matriculas where aluno_id = (select valor::uuid from t_ctx where chave='aluno1') and ativa), 'saiu das turmas';
end $$;

\echo 'ok - contas escolares: criação, colisão, login, bloqueio, redefinição, troca de usuário, permissões, vínculo e transferência'
rollback;
