-- Testes da migração 14: aluno existente pelo código, importação,
-- entrada só pelo professor e ranking anônimo da turma.
\set QUIET on
begin;
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'prof.a@t.com', '{"nome":"Prof A","tipo":"professor"}', '{"provider":"email"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'prof.b@t.com', '{"nome":"Prof B","tipo":"professor"}', '{"provider":"email"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'user@t.com', '{"nome":"Usuário Comum","tipo":"usuario"}', '{"provider":"email"}');

set local role authenticated;
-- Professor A: turma de Português com 7 alunos criados por ele
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
insert into public.turmas (nome, professor_id) values ('Português 7A', '00000000-0000-0000-0000-0000000000a1');
create temp table t_ids as select (select max(id) from public.turmas) as port;
create temp table t_alunos as
select * from public.professor_criar_alunos((select port from t_ids), '[
  {"nome":"Ana Lima","login_base":"ana.lima","senha":"gato427"},
  {"nome":"Bruno Reis","login_base":"bruno.reis","senha":"gato427"},
  {"nome":"Caio Souza","login_base":"caio.souza","senha":"gato427"},
  {"nome":"Duda Alves","login_base":"duda.alves","senha":"gato427"},
  {"nome":"Enzo Costa","login_base":"enzo.costa","senha":"gato427"},
  {"nome":"Fabi Rocha","login_base":"fabi.rocha","senha":"gato427"},
  {"nome":"Gabi Melo","login_base":"gabi.melo","senha":"gato427"}]');

-- Professor B: turma de Matemática
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
insert into public.turmas (nome, professor_id) values ('Matemática 7A', '00000000-0000-0000-0000-0000000000a2');
reset role;
update t_ids set port = port;
alter table t_ids add column mat bigint;
update t_ids set mat = (select max(id) from public.turmas);
alter table t_alunos add column codigo text;
update t_alunos a set codigo = u.codigo_aluno from public.usuarios u where u.id = a.novo_id;
create temp table t_user as select codigo_aluno from public.usuarios where id = '00000000-0000-0000-0000-0000000000a3';
grant select on t_ids, t_alunos, t_user to authenticated;

-- Resultados de trilha para o ranking (inseridos como sistema)
select null from set_config('request.jwt.claim.sub', '', true);
insert into public.exercicios (titulo, texto_referencia, nivel, publicado, nivel_trilha, ordem)
select 'Teste ' || n, 'texto do teste ' || n, 'facil', true, 1, n from generate_series(19, 20) n
on conflict do nothing;
insert into public.resultados (aluno_id, exercicio_id, ppm, precisao, tempo_seg, acertos, erros, criado_em)
select a.novo_id, (select id from public.exercicios where nivel_trilha = 1 and ordem = 20 limit 1),
  10 + 5 * row_number() over (order by a.novo_login), 95, 30, 100, 5, now() + interval '1 minute'
from t_alunos a;

set local role authenticated;
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
do $$
declare
  v_ana uuid := (select novo_id from t_alunos where novo_login = 'ana.lima');
  v_codigo text := (select codigo from t_alunos where novo_login = 'ana.lima');
  v_busca record;
  v_negado boolean := false;
  v_contas_antes int;
begin
  -- Busca pelo código mostra só dados básicos
  select * into v_busca from public.buscar_aluno_por_codigo((select mat from t_ids), lower(v_codigo));
  assert v_busca.aluno_id = v_ana and v_busca.nome = 'Ana Lima', 'busca encontra o cadastro existente';
  assert v_busca.turmas_ativas = 1 and not v_busca.ja_na_turma, 'busca mostra turmas e se já está na turma';

  -- Professor B não gerencia a turma do professor A
  begin perform public.adicionar_aluno_existente((select port from t_ids), v_codigo);
  exception when insufficient_privilege then v_negado := true; end;
  assert v_negado, 'professor só adiciona nas próprias turmas';

  -- Confirmação vincula o MESMO usuário (sem conta nova)
  v_contas_antes := (select count(*) from public.usuarios);
  assert public.adicionar_aluno_existente((select mat from t_ids), v_codigo) = 'adicionado', 'aluno adicionado';
  assert public.adicionar_aluno_existente((select mat from t_ids), v_codigo) = 'ja_estava', 'segunda vez não duplica';
  assert (select count(*) from public.usuarios) = v_contas_antes, 'nenhuma conta nova criada';
  assert (select turmas_ativas from public.buscar_aluno_por_codigo((select mat from t_ids), v_codigo)) = 2, 'aluno nas duas turmas';

  -- Remover e adicionar de novo reativa a mesma matrícula
  perform public.remover_aluno_da_turma((select mat from t_ids), v_ana);
  assert public.adicionar_aluno_existente((select mat from t_ids), v_codigo) = 'reativado', 'matrícula reativada';
  assert (select count(*) from public.matriculas where aluno_id = v_ana and turma_id = (select mat from t_ids)) = 1, 'uma matrícula por turma';

  -- Código inexistente / usuário comum não são aceitos
  v_negado := false;
  begin perform public.buscar_aluno_por_codigo((select mat from t_ids), 'ZZZZZZ'); exception when no_data_found then v_negado := true; end;
  assert v_negado, 'código inexistente';
  v_negado := false;
  begin perform public.adicionar_aluno_existente((select mat from t_ids),
    (select codigo_aluno from t_user));
  exception when no_data_found then v_negado := true; end;
  assert v_negado, 'conta de usuário comum não vira aluno de turma';

  -- Exportação: alunos_da_turma traz o código
  assert (select codigo_aluno from public.alunos_da_turma((select mat from t_ids)) where aluno_id = v_ana) = v_codigo, 'código na lista';
end $$;

-- Importação: ignora quem já está na turma e repetições do arquivo
do $$
declare v_res record; v_criados int := 0; v_ja int := 0; v_rep int := 0;
begin
  for v_res in select * from public.professor_importar_alunos((select mat from t_ids), '[
    {"nome":"ANA  lima","login_base":"ana.lima","senha":"gato427"},
    {"nome":"Hugo Prado","login_base":"hugo.prado","senha":"gato427"},
    {"nome":"Íris Nunes","login_base":"iris.nunes","senha":"gato427"},
    {"nome":"Iris Nunes","login_base":"iris.nunes","senha":"gato427"}]') loop
    if v_res.situacao = 'criado' then v_criados := v_criados + 1;
    elsif v_res.situacao = 'ja_na_turma' then v_ja := v_ja + 1; assert v_res.indice = 0, 'índice do já matriculado';
    elsif v_res.situacao = 'repetido_no_arquivo' then v_rep := v_rep + 1; assert v_res.indice = 3, 'índice do repetido';
    end if;
  end loop;
  assert v_criados = 2 and v_ja = 1 and v_rep = 1, format('resumo da importação: %s/%s/%s', v_criados, v_ja, v_rep);
  assert (select count(*) from public.alunos_da_turma((select mat from t_ids))) = 3, 'turma com 3 alunos';
end $$;

-- Aluno: não entra em turma pelo código; ranking anônimo
select null from set_config('request.jwt.claim.sub', (select novo_id::text from t_alunos where novo_login = 'bruno.reis'), true);
do $$
declare v_negado boolean := false; v_linhas int; v_minha record;
begin
  begin perform public.entrar_na_turma((select codigo_convite from public.turmas where id = (select port from t_ids)));
  exception when insufficient_privilege then v_negado := true; end;
  assert v_negado, 'aluno não entra em turma pelo código';

  select count(*) into v_linhas from public.ranking_turma((select port from t_ids));
  assert v_linhas = 6, format('top 5 + a própria posição (veio %s)', v_linhas);
  assert (select animal from public.ranking_turma((select port from t_ids)) where posicao = 1) = 'Guepardo', '1º é o guepardo';
  assert (select string_agg(animal, ',' order by posicao) from public.ranking_turma((select port from t_ids)) where posicao <= 5)
    = 'Guepardo,Lebre,Raposa,Cavalo,Gato', 'animais na ordem';
  select * into v_minha from public.ranking_turma((select port from t_ids)) where voce;
  assert v_minha.posicao = 6 and v_minha.animal is null, 'aluno vê a própria posição fora do top 5';
  assert (select count(*) from public.ranking_turma((select port from t_ids)) where voce) = 1, 'só uma linha marcada como você';

  -- Ranking de outra turma: recusado
  v_negado := false;
  begin perform public.ranking_turma((select mat from t_ids)); exception when insufficient_privilege then v_negado := true; end;
  assert v_negado, 'ranking só da própria turma';

  -- Ranking por exercício não mostra nomes de colegas
  assert (select count(*) from public.ranking_exercicio((select id from public.exercicios where nivel_trilha = 1 and ordem = 20 limit 1))
          where aluno_nome is not null) = 1, 'só o próprio nome aparece';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.usuarios where nome = 'Ana Lima') = 1, 'Ana continua com uma conta só';
  assert (select count(*) from public.matriculas m join public.usuarios u on u.id = m.aluno_id where u.nome = 'Ana Lima' and m.ativa) = 2,
    'Ana ativa nas duas turmas';
  assert not has_function_privilege('authenticated', 'public.entrar_na_turma(character varying)', 'execute'), 'entrar_na_turma sem execute';
end $$;
\echo 'ok - gestão de alunos: aluno existente, importação, entrada só pelo professor e ranking anônimo'
rollback;
