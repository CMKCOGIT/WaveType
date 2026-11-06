-- Testes da migração 13: só o professor cria conta de aluno.
\set QUIET on
begin;
-- Cadastro público pedindo "aluno" (e-mail) e "professor"/"usuario" como antes
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'tenta@t.com', '{"nome":"Tenta Aluno","tipo":"aluno"}', '{"provider":"email"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'prof@t.com', '{"nome":"Prof","tipo":"professor"}', '{"provider":"email"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'user@t.com', '{"nome":"User","tipo":"usuario"}', '{"provider":"email"}'),
  ('00000000-0000-0000-0000-0000000000e4', 'google@t.com', '{"full_name":"Gabi Google"}', '{"provider":"google"}');
do $$ begin
  assert (select not tipo_definido from public.usuarios where id = '00000000-0000-0000-0000-0000000000e1'), 'cadastro público com tipo aluno fica incompleto';
  assert (select tipo::text = 'professor' and tipo_definido from public.usuarios where id = '00000000-0000-0000-0000-0000000000e2'), 'professor continua se cadastrando';
  assert (select tipo::text = 'usuario' and tipo_definido from public.usuarios where id = '00000000-0000-0000-0000-0000000000e3'), 'usuário continua se cadastrando';
end $$;

set local role authenticated;
-- Conclusão do cadastro (Google) não aceita aluno; aceita usuário/professor
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e4', true);
do $$
declare negado boolean := false;
begin
  begin perform public.concluir_cadastro('aluno', 'Gabi Google'); exception when insufficient_privilege then negado := sqlerrm like 'Contas de aluno são criadas pelo professor%'; end;
  assert negado, 'concluir_cadastro recusa aluno';
  assert (public.concluir_cadastro('usuario', 'Gabi Google')).tipo::text = 'usuario', 'concluir como usuário funciona';
end $$;

-- Usuário não vira aluno sozinho
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e3', true);
do $$
declare negado boolean := false;
begin
  begin perform public.alterar_tipo_conta('aluno'); exception when insufficient_privilege then negado := true; end;
  assert negado, 'usuário → aluno bloqueado';
  negado := false;
  begin perform public.entrar_na_turma('QUALQUER'); exception when insufficient_privilege then negado := true; end;
  assert negado, 'usuário não entra em turma';
end $$;

-- Fluxo completo: professor cria o aluno, o aluno entra com as credenciais
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e2', true);
insert into public.turmas (nome, professor_id) values ('6º B', '00000000-0000-0000-0000-0000000000e2');
create temp table t_novo as
select * from public.professor_criar_alunos((select max(id) from public.turmas), '[{"nome":"Rafa Lima","login_base":"rafa.lima","senha":"panda357"}]');
reset role;
do $$ begin
  assert (select tipo::text = 'aluno' and tipo_definido from public.usuarios where id = (select novo_id from t_novo)), 'aluno criado pelo professor é aluno';
  assert (select encrypted_password like '$2a$%' and encrypted_password <> 'panda357' from auth.users where id = (select novo_id from t_novo)), 'senha só como hash';
end $$;
set local role anon;
do $$ begin
  assert public.login_escolar('rafa.lima', 'panda357') like '%@aluno.wavetype.com.br', 'aluno entra com usuário e senha gerados';
end $$;
reset role;
set local role authenticated;
select null from set_config('request.jwt.claim.sub', (select novo_id::text from t_novo), true);
do $$
declare negado boolean := false;
begin
  assert public.meu_tipo() = 'aluno', 'sessão do aluno tem papel aluno';
  begin perform public.professor_criar_alunos(1, '[{"nome":"X Y","login_base":"x.y","senha":"gato427"}]');
  exception when insufficient_privilege then negado := true; end;
  assert negado, 'aluno não cria contas';
  negado := false;
  begin perform public.alterar_tipo_conta('usuario'); exception when insufficient_privilege then negado := sqlerrm like 'Esta conta foi criada pela escola%'; end;
  assert negado, 'conta da escola não vira pessoal fora da transferência';
end $$;
\echo 'ok - aluno só pelo professor: cadastro público, conclusão, troca de tipo e fluxo professor → aluno'
rollback;
