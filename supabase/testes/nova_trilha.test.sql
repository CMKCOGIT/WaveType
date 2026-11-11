-- Testes da migração 17: nova trilha 5 x 20, histórico preservado.
\set QUIET on
begin;
do $$ begin
  assert (select count(*) from public.exercicios where nivel_trilha between 1 and 5 and publicado) = 100, '100 exercícios publicados';
  assert (select count(distinct texto_referencia) from public.exercicios where nivel_trilha between 1 and 5) = 100, 'textos únicos';
  assert (select min(char_length(texto_referencia)) from public.exercicios where nivel_trilha between 1 and 5) >= 150, '150+ caracteres';
  assert not exists (select 1 from public.exercicios where nivel_trilha between 1 and 5 group by nivel_trilha having count(*) <> 20), '20 por nível';
  assert not exists (select 1 from public.exercicios where nivel_trilha = 6 and publicado), 'nível 6 fora da trilha';
  assert (select count(*) from public.exercicios where nivel_trilha = 6) = 20, 'nível 6 preservado (não apagado)';
  assert (select texto_referencia from public.exercicios where nivel_trilha = 1 and ordem = 1) like 'fff jjj%', 'nível 1 começa em F e J';
  -- Tempo máximo recalculado para o texto novo
  assert not exists (
    select 1 from public.exercicios where nivel_trilha between 1 and 5
      and tempo_limite_seg is distinct from public.tempo_limite_trilha(texto_referencia, nivel_trilha)
  ), 'tempo máximo recalculado';
  assert (select criterio from public.conquistas where codigo = 'nivel_extremo') = 'etapas_completas', 'conquista do nível 6 com critério alcançável';
end $$;

-- Um resultado antigo continua ligado ao mesmo exercício depois de reaplicar a migração
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'u@t.com', '{"nome":"Usu","tipo":"usuario"}', '{"provider":"email"}');
create temp table t_antes as select id, nivel_trilha, ordem from public.exercicios where nivel_trilha is not null;
insert into public.resultados (aluno_id, exercicio_id, ppm, precisao, acertos, erros, tempo_seg)
values ('00000000-0000-0000-0000-0000000000d1', (select id from t_antes where nivel_trilha = 2 and ordem = 5), 20, 96, 100, 4, 60);
update public.exercicios set texto_referencia = 'texto velho de teste' where nivel_trilha = 2 and ordem = 5;
\i supabase/migrations/20261111000017_nova_trilha_progressiva.sql
do $$ begin
  assert (select count(*) from t_antes a join public.exercicios e using (id) where e.nivel_trilha = a.nivel_trilha and e.ordem = a.ordem)
       = (select count(*) from t_antes), 'mesmos ids';
  assert (select count(*) from public.exercicios where nivel_trilha is not null) = (select count(*) from t_antes), 'nada duplicado';
  assert (select count(*) from public.resultados r join public.exercicios e on e.id = r.exercicio_id
          where e.nivel_trilha = 2 and e.ordem = 5 and r.aluno_id = '00000000-0000-0000-0000-0000000000d1') = 1, 'resultado preservado';
  assert (select texto_referencia from public.exercicios where nivel_trilha = 2 and ordem = 5) <> 'texto velho de teste', 'texto atualizado de novo';
end $$;
\echo 'ok - nova trilha: 100 exercícios, histórico e ids preservados'
rollback;
