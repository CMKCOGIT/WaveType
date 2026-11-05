-- Testes da migração 10 (nivelamento): quem grava e quem lê.
\set QUIET on
begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'prof@t.com', '{"nome":"Prof","tipo":"professor"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'outro@t.com', '{"nome":"Outro","tipo":"professor"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'aluno@t.com', '{"nome":"Aluno","tipo":"aluno"}');
insert into public.turmas (id, nome, professor_id) overriding system value values (900, 'T', '00000000-0000-0000-0000-0000000000b1');
insert into public.matriculas (aluno_id, turma_id) values ('00000000-0000-0000-0000-0000000000c1', 900);

set local role authenticated;
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
insert into public.nivelamentos (usuario_id, nivel, licao_nivel, licao_ordem, teclas_frageis)
values (auth.uid(), 'basico', 2, 1, '{q,p}');
insert into public.sugestoes_nivel (usuario_id, recomendado_nivel, recomendado_ordem, decisao) values (auth.uid(), 2, 1, 'ignorou');
do $$
declare negado boolean := false;
begin
  begin
    insert into public.nivelamentos (usuario_id, nivel, licao_nivel, licao_ordem) values ('00000000-0000-0000-0000-0000000000b2', 'avancado', 6, 1);
  exception when insufficient_privilege then negado := true; end;
  assert negado, 'ninguém grava nivelamento em nome de outra pessoa';
  assert (select count(*) from public.nivelamentos) = 1, 'aluno lê o próprio';
end $$;

select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
do $$ begin
  assert (select count(*) from public.nivelamentos) = 1, 'professor da turma lê o nível de partida';
  assert (select count(*) from public.sugestoes_nivel) = 1, 'e as sugestões';
end $$;
select null from set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
do $$ begin
  assert (select count(*) from public.nivelamentos) = 0, 'outro professor não lê';
end $$;
\echo 'ok - nivelamento: gravação própria e leitura do professor da turma'
rollback;
