-- Minimal efterlikning av Supabase (auth-schema, roller, auth.uid()) så att
-- migrationerna kan testas mot en lokal, tom Postgres. Körs bara lokalt.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;

-- En användare som finns innan migrationerna körs.
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-00000000000a', 'Anna@example.com');
