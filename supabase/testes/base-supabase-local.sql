-- Simula o mínimo do Supabase num Postgres local, para testar as migrações:
-- papéis anon/authenticated, schema auth (users, identities, sessions),
-- auth.uid() a partir de request.jwt.claim.sub e pgcrypto em extensions.
-- Uso: psql -f base-supabase-local.sql; schema.sql; migrations/*.sql; testes/*.sql
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (
  instance_id uuid, id uuid primary key, aud varchar(255), role varchar(255), email varchar(255),
  encrypted_password varchar(255), email_confirmed_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz,
  confirmation_token varchar(255), email_change varchar(255), email_change_token_new varchar(255), recovery_token varchar(255)
);
create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null, identity_data jsonb not null, provider text not null,
  last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz,
  email text generated always as (lower(identity_data->>'email')) stored,
  unique (provider_id, provider)
);
create table if not exists auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth, extensions to anon, authenticated;
-- Privilégios padrão do Supabase (as migrações revogam o que não deve valer)
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
