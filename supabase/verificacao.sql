-- ============================================================
-- Verificação da trilha e das regras (somente leitura)
-- Rode no SQL Editor do Supabase depois das migrações.
-- Cada consulta deve voltar vazia ou com os valores indicados.
-- ============================================================

-- 1) Quantidade por nível: todos devem ter 20 (níveis 1 a 6)
select nivel_trilha as nivel, count(*) as exercicios,
       case when count(*) = 20 then 'ok' else 'ATENÇÃO' end as situacao
from public.exercicios
where nivel_trilha is not null
group by nivel_trilha
order by nivel_trilha;

-- 2) Ordens faltando em algum nível (deve voltar vazio)
select n.nivel, o.ordem as ordem_faltando
from generate_series(1, 6) n(nivel)
cross join generate_series(1, 20) o(ordem)
where not exists (
  select 1 from public.exercicios e where e.nivel_trilha = n.nivel and e.ordem = o.ordem
)
order by 1, 2;

-- 3) Duplicados na trilha (deve voltar vazio)
select nivel_trilha, ordem, count(*), array_agg(id order by id) as ids
from public.exercicios
where nivel_trilha is not null
group by nivel_trilha, ordem
having count(*) > 1;

-- 4) Ordens fora de 1..20 (deve voltar vazio)
select id, nivel_trilha, ordem, titulo
from public.exercicios
where nivel_trilha is not null and (ordem is null or ordem not between 1 and 20);

-- 5) Resultados do Nível 6 marcados como concluídos com precisão <= 85 (deve voltar vazio)
select r.id, r.aluno_id, r.precisao, r.concluido
from public.resultados r
join public.exercicios e on e.id = r.exercicio_id
where e.nivel_trilha = 6 and r.concluido and r.precisao <= 85;

-- 6) Matrículas duplicadas (deve voltar vazio; a tabela tem unique)
select aluno_id, turma_id, count(*) from public.matriculas group by 1, 2 having count(*) > 1;

-- 7) Perfis com cadastro incompleto (informativo)
select id, nome, email, tipo, criado_em from public.usuarios where not tipo_definido order by criado_em desc;

-- 8) Políticas RLS ativas (informativo)
select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by 1, 2;
