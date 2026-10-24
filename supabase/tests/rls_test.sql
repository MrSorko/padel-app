-- Testar schema och RLS. Kör efter supabase_stub.sql och migrationerna:
--   supabase/tests/run_local.sh
-- Varje kontroll som misslyckas avbryter med ett fel.
\set ON_ERROR_STOP 1
\o /dev/null

-- Hjälpare: förvänta att en sats misslyckas.
create or replace function pg_temp.expect_error(sql text, label text)
returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FEL: % borde ha misslyckats', label;
exception when others then
  if sqlerrm like 'FEL:%' then raise; end if;
  raise notice 'ok (nekad): % -> %', label, sqlerrm;
end $$;

create or replace function pg_temp.expect_rows(sql text, expected int, label text)
returns void language plpgsql as $$
declare n int;
begin
  execute sql;
  get diagnostics n = row_count;
  if n <> expected then
    raise exception 'FEL: % påverkade % rader, väntade %', label, n, expected;
  end if;
  raise notice 'ok: % (% rader)', label, n;
end $$;

-- Befintlig användare fick profil och står på listan.
do $$ begin
  assert (select display_name from public.profiles
          where id = '00000000-0000-0000-0000-00000000000a') = 'Anna', 'befintlig profil';
  assert exists (select 1 from public.allowed_emails where email = 'anna@example.com'), 'befintlig på listan';
end $$;

-- Registreringsspärr.
select pg_temp.expect_error(
  $q$insert into auth.users (email) values ('okand@example.com')$q$, 'okänd e-post');
insert into public.allowed_emails (email) values
  ('bertil@example.com'), ('cecilia@example.com'), ('david@example.com'), ('erik@example.com');
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000b', 'Bertil@Example.com', '{"display_name":"Bertil B"}'),
  ('00000000-0000-0000-0000-00000000000c', 'cecilia@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000d', 'david@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000e', 'erik@example.com', '{}');
do $$ begin
  assert (select display_name from public.profiles
          where id = '00000000-0000-0000-0000-00000000000b') = 'Bertil B', 'namn från metadata';
  assert (select count(*) from public.profiles) = 5, 'fem profiler';
end $$;

-- anon ser ingenting.
set role anon;
do $$ begin
  assert (select count(*) from public.profiles) = 0, 'anon ser inga profiler';
end $$;
do $$ begin
  assert (select count(*) from public.allowed_emails) = 0, 'anon ser inte listan';
end $$;
reset role;

-- Anna startar en session med A–D = Anna, Bertil, Cecilia, David.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.allowed_emails) = 0, 'inloggad ser inte listan';
  assert (select count(*) from public.profiles) = 5, 'inloggad ser alla profiler';
end $$;
select pg_temp.expect_error(
  $q$insert into public.sessions (id, created_by) values
     ('10000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000b')$q$,
  'starta session i någon annans namn');
insert into public.sessions (id) values ('10000000-0000-0000-0000-000000000001');
insert into public.session_players (session_id, player_id, slot) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'A'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'B'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'C'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 'D');
select pg_temp.expect_error(
  $q$insert into public.session_players (session_id, player_id, slot) values
     ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'A')$q$,
  'dubbel plats A');

-- Matcher: giltig, fel summa, utanför 0–24, spelare utanför sessionen, samma spelare två gånger.
insert into public.matches (session_id, match_number, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score)
values ('10000000-0000-0000-0000-000000000001', 1,
  '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b',
  '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d', 15, 9);
select pg_temp.expect_error(
  $q$insert into public.matches (session_id, match_number, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score)
     values ('10000000-0000-0000-0000-000000000001', 2,
       '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c',
       '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d', 15, 10)$q$,
  'summa 25');
select pg_temp.expect_error(
  $q$insert into public.matches (session_id, match_number, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score)
     values ('10000000-0000-0000-0000-000000000001', 2,
       '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c',
       '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d', 25, -1)$q$,
  'poäng utanför 0–24');
select pg_temp.expect_error(
  $q$insert into public.matches (session_id, match_number, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score)
     values ('10000000-0000-0000-0000-000000000001', 2,
       '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000e',
       '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d', 12, 12)$q$,
  'spelare utanför sessionen');
select pg_temp.expect_error(
  $q$insert into public.matches (session_id, match_number, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score)
     values ('10000000-0000-0000-0000-000000000001', 2,
       '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a',
       '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d', 12, 12)$q$,
  'samma spelare två gånger');
select pg_temp.expect_error(
  $q$insert into public.matches (session_id, match_number, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score)
     values ('10000000-0000-0000-0000-000000000001', 1,
       '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c',
       '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d', 12, 12)$q$,
  'samma matchnummer');

-- Erik är inte med i sessionen: får läsa men inte skriva.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
do $$ begin
  assert (select count(*) from public.matches) = 1, 'icke-deltagare läser matcher';
end $$;
select pg_temp.expect_error(
  $q$insert into public.matches (session_id, match_number, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score)
     values ('10000000-0000-0000-0000-000000000001', 2,
       '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c',
       '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d', 12, 12)$q$,
  'icke-deltagare registrerar match');
select pg_temp.expect_rows($q$update public.matches set team1_score = 20, team2_score = 4$q$, 0,
  'icke-deltagare redigerar match');
select pg_temp.expect_rows($q$delete from public.matches$q$, 0, 'icke-deltagare tar bort match');
select pg_temp.expect_rows($q$update public.sessions set status = 'finished', ended_at = now()$q$, 0,
  'icke-deltagare avslutar session');
select pg_temp.expect_rows($q$update public.session_players set final_position = 1$q$, 0,
  'icke-deltagare sätter placering');
select pg_temp.expect_error(
  $q$insert into public.session_players (session_id, player_id, slot) values
     ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', 'A')$q$,
  'icke-skapare lägger till spelare');
select pg_temp.expect_rows($q$update public.profiles set display_name = 'Hack'
  where id = '00000000-0000-0000-0000-00000000000a'$q$, 0, 'ändra annans profil');
select pg_temp.expect_rows($q$update public.profiles set display_name = 'Erik E'
  where id = '00000000-0000-0000-0000-00000000000e'$q$, 1, 'ändra egen profil');

-- Cecilia (deltagare, inte skapare) redigerar en match, sparar placeringar och avslutar.
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.expect_rows($q$update public.matches set team1_score = 9, team2_score = 15
  where match_number = 1$q$, 1, 'deltagare redigerar match');
select pg_temp.expect_rows($q$update public.session_players set total_points = 15, final_position = 1
  where player_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d')$q$, 2,
  'deltagare sparar placering');
select pg_temp.expect_rows($q$delete from public.sessions$q$, 0, 'icke-skapare tar bort session');
select pg_temp.expect_error($q$update public.sessions set status = 'finished'$q$,
  'avsluta utan ended_at');
select pg_temp.expect_rows($q$update public.sessions set status = 'finished', ended_at = now()$q$, 1,
  'deltagare avslutar session');

-- Avslutad session är låst, även för deltagare och skaparen.
select pg_temp.expect_rows($q$update public.matches set team1_score = 12, team2_score = 12$q$, 0,
  'redigera match i avslutad session');
select pg_temp.expect_error(
  $q$insert into public.matches (session_id, match_number, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score)
     values ('10000000-0000-0000-0000-000000000001', 2,
       '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c',
       '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d', 12, 12)$q$,
  'ny match i avslutad session');
select pg_temp.expect_rows($q$update public.session_players set final_position = 4$q$, 0,
  'ändra placering i avslutad session');
select pg_temp.expect_rows($q$update public.sessions set status = 'active', ended_at = null$q$, 0,
  'återöppna avslutad session');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_rows($q$delete from public.sessions$q$, 0, 'skaparen tar bort avslutad session');

-- Skaparen kan ta bort en pågående session; spelare och matcher följer med.
insert into public.sessions (id) values ('10000000-0000-0000-0000-000000000002');
insert into public.session_players (session_id, player_id, slot) values
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'A'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'B'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', 'C'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000e', 'D');
insert into public.matches (session_id, match_number, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score)
values ('10000000-0000-0000-0000-000000000002', 1,
  '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b',
  '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000e', 12, 12);
select pg_temp.expect_rows($q$delete from public.sessions where id = '10000000-0000-0000-0000-000000000002'$q$, 1,
  'skaparen tar bort pågående session');
do $$ begin
  assert (select count(*) from public.matches where session_id = '10000000-0000-0000-0000-000000000002') = 0,
    'matcher borttagna';
end $$;
reset role;

\o
\echo 'Alla RLS-tester gick igenom.'
