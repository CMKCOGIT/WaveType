-- Testes da migração 15: detalhe das tentativas e análise do professor.
\set QUIET on
begin;
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'prof1@t.com', '{"nome":"Prof Um","tipo":"professor"}', '{"provider":"email"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'prof2@t.com', '{"nome":"Prof Dois","tipo":"professor"}', '{"provider":"email"}');

set local role authenticated;
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
insert into public.turmas (nome, professor_id) values ('Turma IF', '00000000-0000-0000-0000-0000000000b1');
create temp table t_ctx as select (select max(id) from public.turmas) as turma;
create temp table t_alunos as
select * from public.professor_criar_alunos((select turma from t_ctx), '[
  {"nome":"Kaike Elias","login_base":"kaike.elias","senha":"mapa739"},
  {"nome":"Lia Souza","login_base":"lia.souza","senha":"mapa739"},
  {"nome":"Mel Dias","login_base":"mel.dias","senha":"mapa739"}]');
alter table t_ctx add column atividade bigint;
update t_ctx set atividade = public.salvar_atividade(null, 'Ditado curto', null, 'o gato pulou o muro', 'facil', 60, null, 80, array[(select turma from t_ctx)], true);
reset role;
grant select, update on t_ctx, t_alunos to authenticated;

-- Kaike faz a atividade e grava o detalhe
set local role authenticated;
select null from set_config('request.jwt.claim.sub', (select novo_id::text from t_alunos where novo_login = 'kaike.elias'), true);
insert into public.resultados (aluno_id, exercicio_id, turma_id, ppm, precisao, acertos, erros, tempo_seg)
values ((select novo_id from t_alunos where novo_login = 'kaike.elias'), (select atividade from t_ctx), (select turma from t_ctx), 22, 84, 16, 3, 14);
create temp table t_res as select max(id) as id from public.resultados;
do $$
declare v_negado boolean := false;
begin
  perform public.registrar_detalhes_resultado((select id from t_res), '{
    "palavras": [["o","o",0],["gato","gado",1],["pulou","pulou",2],["o","o",0],["muro","mur",0]],
    "erros_por_tecla": {"t": 1, "o": 2}, "ppm_bruto": 25.5, "consistencia": 71, "erros_corrigidos": 2,
    "omitidas": 1, "extras": 0, "modo_erros": "fluxo"}');
  -- Segunda gravação não altera o detalhe
  perform public.registrar_detalhes_resultado((select id from t_res), '{"palavras": [["x","y",9]]}');
  assert (select palavras->1->>1 from public.resultados_detalhes where resultado_id = (select id from t_res)) = 'gado', 'detalhe gravado uma vez só';
  -- Formato inválido é recusado
  begin perform public.registrar_detalhes_resultado((select id from t_res), '{"palavras": "texto"}');
  exception when invalid_parameter_value then v_negado := true; end;
  assert v_negado, 'formato inválido recusado';
  -- Sem escrita direta na tabela
  v_negado := false;
  begin update public.resultados_detalhes set palavras = '[]' where resultado_id = (select id from t_res);
  exception when insufficient_privilege then v_negado := true; end;
  assert v_negado, 'aluno não altera o detalhe';
end $$;

-- Outra aluna da mesma turma não vê o detalhe nem grava no resultado alheio
select null from set_config('request.jwt.claim.sub', (select novo_id::text from t_alunos where novo_login = 'lia.souza'), true);
do $$
declare v_negado boolean := false;
begin
  assert (select count(*) from public.resultados_detalhes) = 0, 'colega não vê o detalhe';
  begin perform public.registrar_detalhes_resultado((select id from t_res), '{"palavras": []}');
  exception when no_data_found then v_negado := true; end;
  assert v_negado, 'colega não grava no resultado de outro';
  v_negado := false;
  begin perform public.entregas_da_atividade((select atividade from t_ctx)); exception when no_data_found then v_negado := true; end;
  assert v_negado, 'aluno não acessa a visão do professor';
end $$;

-- Professor autor: visão da turma e detalhe individual
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
do $$
declare v_kaike record; v_tent record;
begin
  assert (select count(*) from public.entregas_da_atividade((select atividade from t_ctx))) = 3, 'todos os alunos da turma aparecem';
  select * into v_kaike from public.entregas_da_atividade((select atividade from t_ctx)) where nome = 'Kaike Elias';
  assert v_kaike.tentativas = 1 and v_kaike.concluida and v_kaike.com_detalhe and v_kaike.turma_nome = 'Turma IF', 'linha do aluno com tentativa';
  assert (select tentativas from public.entregas_da_atividade((select atividade from t_ctx)) where nome = 'Mel Dias') = 0, 'pendente aparece com 0';
  select * into v_tent from public.tentativas_do_aluno((select atividade from t_ctx), v_kaike.aluno_id);
  assert v_tent.erros = 3 and v_tent.detalhes->'palavras'->1->>1 = 'gado', 'professor vê o que foi digitado';
  assert (v_tent.detalhes->>'erros_corrigidos')::int = 2, 'métricas extras';
  assert (select count(*) from public.resultados_detalhes) = 1, 'professor lê o detalhe pela política';
end $$;

-- Outro professor: nada
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
do $$
declare v_negado boolean := false;
begin
  begin perform public.tentativas_do_aluno((select atividade from t_ctx), (select novo_id from t_alunos where novo_login = 'kaike.elias'));
  exception when no_data_found then v_negado := true; end;
  assert v_negado, 'outro professor não acessa';
  assert (select count(*) from public.resultados_detalhes) = 0, 'outro professor não lê o detalhe';
end $$;
\echo 'ok - detalhe das tentativas: gravação pelo aluno, leitura pelo professor autor e bloqueios'
rollback;
