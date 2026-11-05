-- 20261105000008_modo_erros_turma.sql
-- Modo de erros da digitação definido pelo professor para a turma.
--   'fluxo'    → o cursor avança mesmo com erro (Backspace corrige)
--   'correcao' → o cursor só avança com a tecla certa (iniciantes)
--   null       → padrão do exercício (níveis 1–2 da trilha: correção; demais: fluxo)
-- Só ADICIONA uma coluna opcional. Não altera nem apaga dados. Idempotente.
-- As políticas atuais já cobrem a coluna: só o professor da turma edita
-- (turmas_update) e o aluno matriculado lê (turmas_select).

alter table public.turmas add column if not exists modo_erros text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'turmas_modo_erros_check') then
    alter table public.turmas
      add constraint turmas_modo_erros_check check (modo_erros is null or modo_erros in ('fluxo', 'correcao'));
  end if;
end $$;

comment on column public.turmas.modo_erros is
  'Modo de erros da digitação nas atividades da turma: fluxo, correcao ou null (padrão do exercício).';

notify pgrst, 'reload schema';
