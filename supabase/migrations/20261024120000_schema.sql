-- Fas 2: grundschema för Padel Americano.
-- Statistik räknas fram ur matches och lagras inte separat, förutom
-- final_position och total_points som sparas när en session avslutas.

-- ---------------------------------------------------------------------------
-- profiles: en rad per inloggad spelare (id = auth.users.id)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  created_at timestamptz not null default now()
);

-- Skapa en profil automatiskt när en användare läggs till (inbjudan).
-- Visningsnamnet tas från user metadata "display_name" om det finns,
-- annars från delen före @ i e-postadressen.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiler för användare som redan finns (t.ex. testanvändaren).
insert into public.profiles (id, display_name)
select u.id, split_part(u.email, '@', 1)
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- sessions: en spelkväll
-- ---------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles (id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active' check (status in ('active', 'finished')),
  -- ended_at är satt exakt när sessionen är avslutad
  constraint sessions_ended_at_matches_status
    check ((status = 'finished') = (ended_at is not null))
);

create index sessions_started_at_idx on public.sessions (started_at desc);

-- ---------------------------------------------------------------------------
-- session_players: de fyra spelarna i en session och deras plats A–D
-- ---------------------------------------------------------------------------
create table public.session_players (
  session_id uuid not null references public.sessions (id) on delete cascade,
  player_id uuid not null references public.profiles (id),
  slot char(1) not null check (slot in ('A', 'B', 'C', 'D')),
  final_position smallint check (final_position between 1 and 4),
  total_points integer check (total_points >= 0),
  primary key (session_id, player_id),
  unique (session_id, slot)
);

create index session_players_player_idx on public.session_players (player_id);

-- ---------------------------------------------------------------------------
-- matches: en match 2 mot 2, poängen blir alltid 24 totalt
-- ---------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  match_number integer not null check (match_number > 0),
  team1_p1 uuid not null,
  team1_p2 uuid not null,
  team2_p1 uuid not null,
  team2_p2 uuid not null,
  team1_score smallint not null check (team1_score between 0 and 24),
  team2_score smallint not null check (team2_score between 0 and 24),
  played_at timestamptz not null default now(),
  unique (session_id, match_number),
  constraint matches_total_is_24 check (team1_score + team2_score = 24),
  constraint matches_four_distinct_players check (
    team1_p1 <> team1_p2 and team1_p1 <> team2_p1 and team1_p1 <> team2_p2
    and team1_p2 <> team2_p1 and team1_p2 <> team2_p2
    and team2_p1 <> team2_p2
  ),
  -- Alla fyra spelare måste vara med i sessionen.
  foreign key (session_id, team1_p1) references public.session_players (session_id, player_id),
  foreign key (session_id, team1_p2) references public.session_players (session_id, player_id),
  foreign key (session_id, team2_p1) references public.session_players (session_id, player_id),
  foreign key (session_id, team2_p2) references public.session_players (session_id, player_id)
);
