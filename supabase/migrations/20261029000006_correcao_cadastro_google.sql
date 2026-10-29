-- ============================================================
-- 06 · Correção da conclusão do cadastro com Google
-- ------------------------------------------------------------
-- Idempotente. Não apaga usuários nem escolhe o tipo de conta de ninguém.
--
-- 1. tipo_definido nulo (perfis criados antes da coluna existir) passa a
--    true, que é como o site já tratava esses perfis; a coluna fica NOT NULL.
-- 2. concluir_cadastro aceita perfil com tipo_definido nulo e confere se a
--    gravação ficou de fato no banco; se algo a desfizer, devolve um erro
--    claro em vez de "sucesso" (era isso que prendia a pessoa na tela de
--    conclusão a cada login).
-- 3. Pede ao Supabase para recarregar o cache da API, que é o que gera os
--    erros "Could not find ... in the schema cache" depois de migrações.
-- ============================================================

update public.usuarios set tipo_definido = true where tipo_definido is null;
alter table public.usuarios alter column tipo_definido set default true;
alter table public.usuarios alter column tipo_definido set not null;

create or replace function public.concluir_cadastro(p_tipo text, p_nome text)
returns public.usuarios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_nome text := left(trim(coalesce(p_nome, '')), 120);
  v_perfil public.usuarios;
begin
  if v_uid is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '28000';
  end if;
  if p_tipo is null or p_tipo not in ('usuario', 'aluno', 'professor') then
    raise exception 'Escolha um tipo de conta válido.' using errcode = '22023';
  end if;
  if char_length(v_nome) < 2 then
    raise exception 'Informe seu nome completo.' using errcode = '22023';
  end if;

  -- Perfil ausente (ex.: conta criada antes do trigger existir): cria agora.
  insert into public.usuarios (id, nome, email, tipo, tipo_definido)
  select u.id, v_nome, u.email, 'aluno', false
  from auth.users u
  where u.id = v_uid
  on conflict (id) do nothing;

  update public.usuarios
  set tipo = p_tipo::public.tipo_usuario,
      nome = v_nome,
      tipo_definido = true,
      atualizado_em = now()
  where id = v_uid and not tipo_definido;

  -- Confere o que ficou gravado (um trigger antigo poderia desfazer a mudança).
  select * into v_perfil from public.usuarios where id = v_uid;
  if v_perfil.id is null then
    raise exception 'Perfil não encontrado.' using errcode = 'P0002';
  end if;
  if not v_perfil.tipo_definido then
    raise exception 'O cadastro não pôde ser gravado no banco. Avise o administrador do site.' using errcode = 'P0001';
  end if;
  return v_perfil;
end;
$$;

revoke all on function public.concluir_cadastro(text, text) from public, anon;
grant execute on function public.concluir_cadastro(text, text) to authenticated;

notify pgrst, 'reload schema';
