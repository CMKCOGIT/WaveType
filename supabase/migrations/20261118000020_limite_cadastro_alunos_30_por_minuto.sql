-- ============================================================
-- 20261118000020_limite_cadastro_alunos_30_por_minuto.sql
-- Sobe o limite de envios do cadastro de alunos de 10 para 30 por minuto
-- (um a cada 2 segundos, a mesma pausa que a tela já faz entre envios).
-- Cadastrar um aluno por vez no Perfil ficava lento com 10.
-- Os limites de contas continuam: 300 por hora e 1000 por dia.
-- Idempotente.
-- ============================================================

create or replace function public.verificar_limite_cadastro_alunos(p_quantidade int)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  c_envios_por_minuto constant int := 30;
  c_contas_por_hora constant int := 300;
  c_contas_por_dia constant int := 1000;
  v_prof uuid := auth.uid();
  v_envios int;
  v_hora int;
  v_dia int;
  v_espera int;
begin
  if v_prof is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '42501';
  end if;
  -- Um envio por vez para cada professor (envios simultâneos entram em fila).
  perform pg_advisory_xact_lock(hashtextextended('cadastro_alunos:' || v_prof::text, 0));
  -- Registros antigos não servem mais para nenhum limite.
  delete from public.cadastros_alunos_registro
   where professor_id = v_prof and criado_em < now() - interval '2 days';

  select count(*) into v_envios from public.cadastros_alunos_registro
   where professor_id = v_prof and criado_em > now() - interval '1 minute';
  if v_envios >= c_envios_por_minuto then
    select greatest(1, ceil(extract(epoch from (min(criado_em) + interval '1 minute' - now()))))::int into v_espera
      from (select criado_em from public.cadastros_alunos_registro
             where professor_id = v_prof and criado_em > now() - interval '1 minute'
             order by criado_em desc limit c_envios_por_minuto) recentes;
    raise exception 'Muitos cadastros seguidos. Aguarde % segundos e tente de novo.', v_espera
      using errcode = 'P0429', hint = 'espera_seg=' || v_espera;
  end if;

  select coalesce(sum(quantidade), 0) into v_hora from public.cadastros_alunos_registro
   where professor_id = v_prof and criado_em > now() - interval '1 hour';
  if v_hora + p_quantidade > c_contas_por_hora then
    raise exception 'Limite de % contas de aluno por hora atingido (% criadas na última hora). %',
      c_contas_por_hora, v_hora,
      case when v_hora < c_contas_por_hora
        then format('Agora você pode criar até %s. Divida a lista ou tente mais tarde.', c_contas_por_hora - v_hora)
        else 'Tente de novo mais tarde.' end
      using errcode = 'P0429', hint = 'espera_seg=600';
  end if;

  select coalesce(sum(quantidade), 0) into v_dia from public.cadastros_alunos_registro
   where professor_id = v_prof and criado_em > now() - interval '1 day';
  if v_dia + p_quantidade > c_contas_por_dia then
    raise exception 'Limite de % contas de aluno por dia atingido (% criadas nas últimas 24 horas). Tente de novo amanhã ou fale com o suporte.',
      c_contas_por_dia, v_dia
      using errcode = 'P0429', hint = 'espera_seg=3600';
  end if;

  insert into public.cadastros_alunos_registro (professor_id, quantidade) values (v_prof, p_quantidade);
end;
$$;

revoke all on function public.verificar_limite_cadastro_alunos(int) from public, anon, authenticated;
