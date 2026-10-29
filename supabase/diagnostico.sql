-- ============================================================
-- Diagnóstico do banco (somente leitura: não altera nada)
-- Rode no SQL Editor do Supabase e envie o resultado se algo aparecer
-- como "FALTANDO" ou "ATENÇÃO".
-- ============================================================

select item, situacao from (
  -- Migrações aplicadas (cada uma deixa algo verificável)
  select 1 as ordem, 'Migração 01: função concluir_cadastro' as item,
    case when to_regprocedure('public.concluir_cadastro(text, text)') is not null then 'ok' else 'FALTANDO' end as situacao
  union all
  select 2, 'Migração 02: tabela exercicio_turmas',
    case when to_regclass('public.exercicio_turmas') is not null then 'ok' else 'FALTANDO' end
  union all
  select 3, 'Migração 03: trigger resultados_validar',
    case when exists (select 1 from pg_trigger where tgname = 'resultados_validar' and not tgisinternal) then 'ok' else 'FALTANDO' end
  union all
  select 4, 'Migração 04: função progresso_conquistas',
    case when to_regprocedure('public.progresso_conquistas()') is not null then 'ok' else 'FALTANDO' end
  union all
  select 5, 'Migração 05: coluna resultados.concluiu_texto',
    case when exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'resultados' and column_name = 'concluiu_texto')
         then 'ok' else 'FALTANDO' end
  union all
  select 6, 'Migração 06: tipo_definido obrigatório',
    case when exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'usuarios' and column_name = 'tipo_definido' and is_nullable = 'NO')
         then 'ok' else 'FALTANDO' end
  union all
  -- Cadastro com Google
  select 10, 'Contas presas na conclusão do cadastro',
    (select count(*) from public.usuarios where tipo_definido is distinct from true)::text || ' perfil(is)'
  union all
  select 11, 'Contas do Auth sem perfil em usuarios',
    (select count(*) from auth.users u where not exists (select 1 from public.usuarios p where p.id = u.id))::text || ' conta(s)'
  union all
  select 12, 'Triggers na tabela usuarios (possível conflito)',
    coalesce((select string_agg(tgname, ', ') from pg_trigger
              where tgrelid = 'public.usuarios'::regclass and not tgisinternal), 'nenhum')
  union all
  select 13, 'Triggers em auth.users',
    coalesce((select string_agg(t.tgname || ' → ' || p.proname, ', ') from pg_trigger t join pg_proc p on p.oid = t.tgfoid
              where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal), 'nenhum')
  union all
  select 14, 'Regras (check) na tabela usuarios',
    coalesce((select string_agg(conname || ': ' || pg_get_constraintdef(oid), ' | ') from pg_constraint
              where conrelid = 'public.usuarios'::regclass and contype = 'c'), 'nenhuma')
  union all
  select 15, 'Valores aceitos em usuarios.tipo',
    coalesce((select string_agg(enumlabel, ', ' order by enumsortorder) from pg_enum
              where enumtypid = 'public.tipo_usuario'::regtype), '?')
) diagnostico
order by ordem;
