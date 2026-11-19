-- Testes das migrações 19 a 21: limite de frequência no cadastro de alunos pelo professor.
\set QUIET on
begin;
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'proff@t.com', '{"nome":"Prof F","tipo":"professor"}', '{"provider":"email"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'profg@t.com', '{"nome":"Prof G","tipo":"professor"}', '{"provider":"email"}');
insert into public.turmas (nome, professor_id) values ('Limite F', '00000000-0000-0000-0000-0000000000f1'), ('Limite G', '00000000-0000-0000-0000-0000000000f2');

create function pg_temp.lote(p_n int, p_prefixo text) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('nome', 'Aluno ' || p_prefixo || ' ' || i, 'login_base', 'al.' || p_prefixo || '.' || i, 'senha', 'gato' || i || 'x'))
  from generate_series(1, p_n) i
$$;
create function pg_temp.mensagem_de(p_turma bigint, p_alunos jsonb) returns text language plpgsql as $$
declare v_msg text; v_codigo text;
begin
  perform public.professor_criar_alunos(p_turma, p_alunos);
  return null;
exception when others then
  get stacked diagnostics v_msg = message_text, v_codigo = returned_sqlstate;
  return v_codigo || ' ' || v_msg;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

set local role authenticated;
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
do $$
declare
  v_turma bigint := (select id from public.turmas where nome = 'Limite F');
  v_msg text;
begin
  -- 50 envios no mesmo minuto: aceitos; o 51º é recusado com o tempo de espera
  for i in 1 .. 50 loop
    perform public.professor_criar_alunos(v_turma, pg_temp.lote(1, 'm' || i));
  end loop;
  v_msg := pg_temp.mensagem_de(v_turma, pg_temp.lote(1, 'm51'));
  assert v_msg like 'P0429 Muitos cadastros seguidos. Aguarde % segundos%', 'limite por minuto: ' || coalesce(v_msg, 'aceito');
  assert (select count(*) from public.contas_escolares where criada_por = auth.uid()) = 50, 'o recusado não criou conta';

  -- Outro professor não é afetado
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', true);
  perform public.professor_criar_alunos((select id from public.turmas where nome = 'Limite G'), pg_temp.lote(1, 'g'));
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
end $$;

-- Passa o minuto: os envios saem da janela de 1 minuto, mas contam na hora (50 contas)
reset role;
update public.cadastros_alunos_registro set criado_em = criado_em - interval '2 minutes';
set local role authenticated;
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
do $$
declare
  v_turma bigint := (select id from public.turmas where nome = 'Limite F');
  v_msg text;
begin
  -- 50 + 4 x 60 + 10 = 300 na hora: aceitos
  for i in 1 .. 4 loop
    perform public.professor_criar_alunos(v_turma, pg_temp.lote(60, 'h' || i));
  end loop;
  perform public.professor_criar_alunos(v_turma, pg_temp.lote(10, 'h5'));
  v_msg := pg_temp.mensagem_de(v_turma, pg_temp.lote(1, 'h6'));
  assert v_msg like 'P0429 Limite de 300 contas de aluno por hora atingido (300 criadas%', 'limite por hora: ' || coalesce(v_msg, 'aceito');
end $$;

-- Passa a hora: o limite do dia (1000) continua valendo
reset role;
update public.cadastros_alunos_registro set criado_em = criado_em - interval '2 hours';
insert into public.cadastros_alunos_registro (professor_id, quantidade, criado_em)
values ('00000000-0000-0000-0000-0000000000f1', 690, now() - interval '3 hours');
set local role authenticated;
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
do $$
declare
  v_turma bigint := (select id from public.turmas where nome = 'Limite F');
  v_msg text;
begin
  -- 300 + 690 = 990 no dia: cabem 10, não 11
  v_msg := pg_temp.mensagem_de(v_turma, pg_temp.lote(11, 'd1'));
  assert v_msg like 'P0429 Limite de 1000 contas de aluno por dia%', 'limite por dia: ' || coalesce(v_msg, 'aceito');
  perform public.professor_criar_alunos(v_turma, pg_temp.lote(10, 'd2'));
  -- O registro não é acessível diretamente
  begin
    perform 1 from public.cadastros_alunos_registro;
    raise exception 'registro não devia ser legível';
  exception when insufficient_privilege then null;
  end;
end $$;
\echo 'ok - limite de cadastro de alunos: 50 envios/minuto, 300 contas/hora, 1000/dia, por professor'
rollback;
