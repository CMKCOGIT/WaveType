-- Testes da migração 18: limites de texto de turmas e exercícios.
\set QUIET on
begin;
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'profe@t.com', '{"nome":"Prof E","tipo":"professor"}', '{"provider":"email"}');
set local role authenticated;
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
do $$
declare
  v_turma bigint;
  v_ativ bigint;
  v_msg text;
begin
  -- 60 caracteres: aceito; 61: recusado com mensagem em português
  insert into public.turmas (nome, professor_id) values (repeat('a', 60), auth.uid()) returning id into v_turma;
  begin
    insert into public.turmas (nome, professor_id) values (repeat('b', 61), auth.uid());
    raise exception 'devia recusar nome com 61 caracteres';
  exception when raise_exception then
    get stacked diagnostics v_msg = message_text;
    assert v_msg like 'O nome da turma pode ter no máximo 60%', 'mensagem do nome: ' || v_msg;
  end;
  begin
    update public.turmas set nome = repeat('c', 61) where id = v_turma;
    raise exception 'devia recusar edição com 61 caracteres';
  exception when raise_exception then
    get stacked diagnostics v_msg = message_text;
    assert v_msg like 'O nome da turma%', 'mensagem da edição: ' || v_msg;
  end;
  -- Mudar outra coluna não confere o nome (turmas antigas continuam editáveis)
  update public.turmas set status = 'encerrada' where id = v_turma;

  -- Título do exercício: 80 aceito, 81 recusado (pela RPC do professor)
  v_ativ := public.salvar_atividade(null, repeat('t', 80), null, 'o gato pulou', 'facil', 60, null, 80, array[v_turma], false);
  assert v_ativ is not null, 'título com 80 caracteres aceito';
  begin
    perform public.salvar_atividade(null, repeat('t', 81), null, 'o gato pulou', 'facil', 60, null, 80, array[v_turma], false);
    raise exception 'devia recusar título com 81 caracteres';
  exception when raise_exception then
    get stacked diagnostics v_msg = message_text;
    assert v_msg like 'O título do exercício pode ter no máximo 80%', 'mensagem do título: ' || v_msg;
  end;
  begin
    perform public.salvar_atividade(null, 'Texto longo', null, repeat('ab ', 1700), 'facil', 60, null, 80, array[v_turma], false);
    raise exception 'devia recusar texto com mais de 5000 caracteres';
  exception when raise_exception then
    get stacked diagnostics v_msg = message_text;
    assert v_msg like 'O texto do exercício%', 'mensagem do texto: ' || v_msg;
  end;
end $$;
\echo 'ok - limites de texto: nome da turma (60), título (80) e texto (5000)'
rollback;
