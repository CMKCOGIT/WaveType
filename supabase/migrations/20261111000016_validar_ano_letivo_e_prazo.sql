-- ============================================================
-- 20261111000016_validar_ano_letivo_e_prazo.sql
-- Regras de cadastro do professor, garantidas no banco (a tela confere o
-- mesmo antes de enviar):
--
-- 1. Turma: ano letivo do ano atual em diante (até 5 anos à frente), no
--    formato "2026" ou "2026 · 2º semestre" (semestre 1–2, bimestre 1–4,
--    trimestre 1–3). Vale ao criar e quando o ano letivo é alterado;
--    turmas antigas que não mexem no campo continuam como estão.
-- 2. Atividade: prazo de entrega no futuro. Vale ao criar e quando o prazo
--    é alterado; editar outros campos de uma atividade com prazo vencido
--    continua possível.
--
-- "Ano atual" e "agora" seguem o horário de Brasília (America/Sao_Paulo);
-- o prazo é um instante (timestamptz), então a comparação com now() não
-- depende de fuso. Não altera dados. Idempotente.
-- ============================================================

create or replace function public.validar_ano_letivo(p_texto text)
returns void
language plpgsql stable
set search_path = public
as $$
declare
  v_m text[];
  v_ano int;
  v_atual int := extract(year from (now() at time zone 'America/Sao_Paulo'))::int;
  v_max int;
begin
  if p_texto is null or trim(p_texto) = '' then
    return;
  end if;
  v_m := regexp_match(trim(p_texto), '^(\d{4})(?: · ([1-9])º (semestre|bimestre|trimestre))?$');
  if v_m is null then
    raise exception 'Ano letivo inválido. Use o ano e, se quiser, o período (ex.: 2026 · 1º semestre).' using errcode = '22023';
  end if;
  v_ano := v_m[1]::int;
  if v_ano < v_atual then
    raise exception 'Não é possível usar um ano que já passou. Escolha % ou um ano seguinte.', v_atual using errcode = '22023';
  end if;
  if v_ano > v_atual + 5 then
    raise exception 'Escolha um ano até %.', v_atual + 5 using errcode = '22023';
  end if;
  if v_m[3] is not null then
    v_max := case v_m[3] when 'semestre' then 2 when 'bimestre' then 4 else 3 end;
    if v_m[2]::int > v_max then
      raise exception '%: o número vai de 1 a %.', initcap(v_m[3]), v_max using errcode = '22023';
    end if;
  end if;
end;
$$;

create or replace function public.turmas_validar_ano_letivo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.ano_letivo is distinct from old.ano_letivo then
    new.ano_letivo := nullif(trim(new.ano_letivo), '');
    perform public.validar_ano_letivo(new.ano_letivo);
  end if;
  return new;
end;
$$;

drop trigger if exists turmas_validar_ano_letivo on public.turmas;
create trigger turmas_validar_ano_letivo
  before insert or update of ano_letivo on public.turmas
  for each row execute function public.turmas_validar_ano_letivo();

-- ------------------------------------------------------------
-- Prazo das atividades
-- ------------------------------------------------------------
create or replace function public.exercicios_validar_prazo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.nivel_trilha is null and new.prazo is not null
     and (tg_op = 'INSERT' or new.prazo is distinct from old.prazo)
     and new.prazo <= now() then
    raise exception 'O prazo de entrega precisa ser uma data e um horário no futuro.' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists exercicios_validar_prazo on public.exercicios;
create trigger exercicios_validar_prazo
  before insert or update of prazo on public.exercicios
  for each row execute function public.exercicios_validar_prazo();

revoke all on function public.validar_ano_letivo(text) from public, anon;
grant execute on function public.validar_ano_letivo(text) to authenticated;
revoke all on function public.turmas_validar_ano_letivo() from public, anon, authenticated;
revoke all on function public.exercicios_validar_prazo() from public, anon, authenticated;

notify pgrst, 'reload schema';
