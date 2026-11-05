-- ============================================================
-- 20261105000012_trocar_usuario_aluno.sql
-- Professor troca o usuário da escola de um aluno (ex.: nome digitado
-- errado). O progresso não muda: tudo está ligado ao ID do aluno, e o
-- e-mail interno de login usa o ID, não o usuário. A senha continua a mesma.
-- Só cria uma função. Idempotente.
-- ============================================================

create or replace function public.professor_alterar_login_aluno(p_aluno_id uuid, p_login text)
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_atual text;
  v_base text := lower(trim(coalesce(p_login, '')));
  v_login text;
  v_n int := 1;
begin
  if auth.uid() is null or coalesce(public.meu_tipo(), '') <> 'professor' then
    raise exception 'Só professores podem trocar o usuário de um aluno.' using errcode = '42501';
  end if;
  select c.login into v_atual
  from public.contas_escolares c
  where c.usuario_id = p_aluno_id
    and c.status = 'escolar'
    and exists (
      select 1 from public.matriculas m join public.turmas t on t.id = m.turma_id
      where m.aluno_id = c.usuario_id and m.ativa and t.professor_id = auth.uid()
    );
  if v_atual is null then
    raise exception 'Este aluno não tem uma conta da escola nas suas turmas.' using errcode = 'P0002';
  end if;
  if v_base !~ '^[a-z0-9]+(\.[a-z0-9]+)*$' or char_length(v_base) not between 3 and 50 then
    raise exception 'Usuário inválido. Use letras sem acento, números e pontos (ex.: maria.silva).' using errcode = '22023';
  end if;
  if v_base = v_atual then
    return v_atual;
  end if;

  v_login := v_base;
  while exists (select 1 from public.contas_escolares where login = v_login and usuario_id <> p_aluno_id) loop
    v_n := v_n + 1;
    v_login := v_base || v_n;
  end loop;

  update public.contas_escolares set login = v_login where usuario_id = p_aluno_id;
  delete from public.tentativas_login_escolar where login in (v_atual, v_login);
  return v_login;
end;
$$;

revoke all on function public.professor_alterar_login_aluno(uuid, text) from public, anon;
grant execute on function public.professor_alterar_login_aluno(uuid, text) to authenticated;

notify pgrst, 'reload schema';
