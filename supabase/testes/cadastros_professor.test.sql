-- Testes da migração 16: ano letivo da turma e prazo da atividade.
\set QUIET on
begin;
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'profc@t.com', '{"nome":"Prof C","tipo":"professor"}', '{"provider":"email"}');
set local role authenticated;
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
do $$
declare
  v_atual int := extract(year from (now() at time zone 'America/Sao_Paulo'))::int;
  v_negado text;
  v_turma bigint;
  v_ativ bigint;
begin
  -- Válidos
  insert into public.turmas (nome, professor_id, ano_letivo) values ('A', auth.uid(), v_atual::text) returning id into v_turma;
  insert into public.turmas (nome, professor_id, ano_letivo) values ('B', auth.uid(), (v_atual + 1) || ' · 2º semestre');
  insert into public.turmas (nome, professor_id, ano_letivo) values ('C', auth.uid(), v_atual || ' · 4º bimestre');
  insert into public.turmas (nome, professor_id, ano_letivo) values ('D', auth.uid(), v_atual || ' · 3º trimestre');
  insert into public.turmas (nome, professor_id) values ('E', auth.uid());

  -- Inválidos
  foreach v_negado in array array[
    (v_atual - 1)::text, v_atual || ' · 3º semestre', v_atual || ' · 5º bimestre', v_atual || ' · 4º trimestre',
    (v_atual + 6)::text, 'manhã'
  ] loop
    begin
      insert into public.turmas (nome, professor_id, ano_letivo) values ('X', auth.uid(), v_negado);
      raise exception 'deveria recusar %', v_negado;
    exception when invalid_parameter_value then null;
    end;
  end loop;

  -- Atualização para ano passado também é recusada
  begin
    update public.turmas set ano_letivo = (v_atual - 1)::text where id = v_turma;
    raise exception 'update para ano passado deveria falhar';
  exception when invalid_parameter_value then null;
  end;

  -- Prazo: futuro aceito, passado recusado (por salvar_atividade)
  v_ativ := public.salvar_atividade(null, 'Ditado', null, 'o gato pulou', 'facil', 60, now() + interval '2 days', 80, array[v_turma], true);
  begin
    perform public.salvar_atividade(null, 'Atrasada', null, 'texto qualquer', 'facil', 60, now() - interval '1 minute', 80, array[v_turma], true);
    raise exception 'prazo passado deveria falhar';
  exception when invalid_parameter_value then
    assert sqlerrm like 'O prazo de entrega precisa ser%', 'mensagem clara';
  end;
  begin
    perform public.salvar_atividade(v_ativ, 'Ditado', null, 'o gato pulou', 'facil', 60, now() - interval '1 hour', 80, array[v_turma], true);
    raise exception 'mudar prazo para o passado deveria falhar';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;

-- Turma e atividade antigas (gravadas antes da regra) continuam editáveis
do $$
declare v_turma bigint; v_ativ bigint;
begin
  alter table public.turmas disable trigger turmas_validar_ano_letivo;
  insert into public.turmas (nome, professor_id, ano_letivo) values ('Antiga', '00000000-0000-0000-0000-0000000000c1', '2020 manhã') returning id into v_turma;
  alter table public.turmas enable trigger turmas_validar_ano_letivo;
  update public.turmas set nome = 'Antiga renomeada' where id = v_turma;
  alter table public.exercicios disable trigger exercicios_validar_prazo;
  insert into public.exercicios (titulo, texto_referencia, nivel, tempo_limite_seg, prazo, criado_por, meta_precisao)
  values ('Vencida', 'texto', 'facil', 60, now() - interval '3 days', '00000000-0000-0000-0000-0000000000c1', 80) returning id into v_ativ;
  alter table public.exercicios enable trigger exercicios_validar_prazo;
  update public.exercicios set titulo = 'Vencida (editada)' where id = v_ativ;
  assert (select ano_letivo from public.turmas where id = v_turma) = '2020 manhã', 'ano antigo preservado';
end $$;
\echo 'ok - ano letivo e prazo validados no banco'
rollback;
