-- Testes da migração 11: conta transferida fora dos relatórios do professor,
-- inclusive se o aluno voltar depois a uma turma.
\set QUIET on
begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'prof@t.com', '{"nome":"Prof","tipo":"professor"}');
insert into public.turmas (id, nome, professor_id) overriding system value values (910, 'T', '00000000-0000-0000-0000-0000000000d1');
insert into public.exercicios (id, titulo, texto_referencia, tempo_limite_seg, criado_por) overriding system value
values (9100, 'Atividade', 'casa mesa', 120, '00000000-0000-0000-0000-0000000000d1');
insert into public.exercicio_turmas (exercicio_id, turma_id) values (9100, 910);

set local role authenticated;
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
create temp table t_aluno as select novo_id as id from public.professor_criar_alunos(910, '[{"nome":"Lia Souza","login_base":"lia.souza","senha":"gato427"}]');

-- Antes da transferência: 1 treino na atividade, nivelamento e sugestão
select null from set_config('request.jwt.claim.sub', (select id::text from t_aluno), true);
insert into public.resultados (aluno_id, exercicio_id, ppm, precisao, acertos, erros, tempo_seg, turma_id)
values (auth.uid(), 9100, 20, 80, 50, 10, 60, 910);
insert into public.nivelamentos (usuario_id, nivel, licao_nivel, licao_ordem) values (auth.uid(), 'basico', 2, 1);

select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$ begin
  assert (select sessoes from public.resumo_turmas_professor() where id = 910) = 1, 'antes: entra na média da turma';
  assert (select entregas from public.atividades_do_professor() where id = 9100) = 1, 'antes: entra nas entregas';
end $$;

-- Transfere (simulando o e-mail vinculado). Os registros de antes ficam
-- uma hora no passado (numa transação, now() é o mesmo instante).
reset role;
update public.resultados set criado_em = now() - interval '1 hour' where aluno_id = (select id from t_aluno);
update public.nivelamentos set criado_em = now() - interval '1 hour' where usuario_id = (select id from t_aluno);
update auth.users set email = 'lia@pessoal.com' where id = (select id from t_aluno);
set local role authenticated;
select null from set_config('request.jwt.claim.sub', (select id::text from t_aluno), true);
select public.transferir_conta_escolar();

select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$ begin
  assert (select sessoes from public.resumo_turmas_professor() where id = 910) = 0, 'depois: fora da contagem da turma';
  assert (select ppm_medio from public.resumo_turmas_professor() where id = 910) is null, 'depois: fora da média';
  assert (select entregas from public.atividades_do_professor() where id = 9100) = 0, 'depois: fora das entregas';
  assert (select count(*) from public.nivelamentos) = 0, 'depois: nível de partida oculto';
end $$;

-- Volta à turma pelo código e treina de novo: o professor vê só o novo
reset role;
update public.matriculas set ativa = true where aluno_id = (select id from t_aluno);
update public.contas_escolares set transferida_em = now() - interval '30 minutes' where usuario_id = (select id from t_aluno);
set local role authenticated;
select null from set_config('request.jwt.claim.sub', (select id::text from t_aluno), true);
insert into public.resultados (aluno_id, exercicio_id, ppm, precisao, acertos, erros, tempo_seg, turma_id)
values (auth.uid(), 9100, 30, 95, 80, 4, 50, 910);
do $$ begin
  assert (select count(*) from public.resultados where aluno_id = auth.uid()) = 2, 'o aluno continua vendo todo o histórico';
end $$;
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$ begin
  assert (select count(*) from public.resultados) = 1, 'professor vê só o treino novo';
  assert (select sessoes from public.alunos_da_turma(910) where nome = 'Lia Souza') = 1, 'lista de alunos conta só o novo';
  assert (select ppm_medio from public.resumo_turmas_professor() where id = 910) = 30, 'média só com o novo';
  assert (select count(*) from public.contas_escolares) = 0, 'conta pessoal: professor não vê a credencial';
end $$;
\echo 'ok - transferência: fora das médias, entregas e nivelamento; ao voltar, só o novo'
rollback;
