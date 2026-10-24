-- Fas 2: Row Level Security och begränsad registrering.
--
-- Regler:
--   * Inloggade användare får läsa allt.
--   * Bara deltagare i en session får skriva matcher i den.
--   * En avslutad session går inte att ändra.

-- ---------------------------------------------------------------------------
-- Hjälpfunktioner (security definer så att de inte själva påverkas av RLS)
-- ---------------------------------------------------------------------------
create function public.is_session_player(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.session_players sp
    where sp.session_id = p_session_id
      and sp.player_id = (select auth.uid())
  );
$$;

create function public.is_session_active(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sessions s
    where s.id = p_session_id
      and s.status = 'active'
  );
$$;

create function public.is_session_creator(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sessions s
    where s.id = p_session_id
      and s.created_by = (select auth.uid())
  );
$$;

revoke execute on function public.is_session_player(uuid) from public, anon;
revoke execute on function public.is_session_active(uuid) from public, anon;
revoke execute on function public.is_session_creator(uuid) from public, anon;
grant execute on function public.is_session_player(uuid) to authenticated;
grant execute on function public.is_session_active(uuid) to authenticated;
grant execute on function public.is_session_creator(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "Inloggade läser profiler"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Spelare ändrar sin egen profil"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Profiler skapas bara av triggern på auth.users.

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
alter table public.sessions enable row level security;

create policy "Inloggade läser sessioner"
  on public.sessions for select
  to authenticated
  using (true);

create policy "Inloggade startar sessioner i eget namn"
  on public.sessions for insert
  to authenticated
  with check (created_by = (select auth.uid()) and status = 'active');

-- Deltagare (eller den som startade) får uppdatera en pågående session,
-- t.ex. avsluta den. En avslutad session är låst.
create policy "Deltagare uppdaterar pågående session"
  on public.sessions for update
  to authenticated
  using (
    status = 'active'
    and (created_by = (select auth.uid()) or public.is_session_player(id))
  )
  with check (created_by = (select auth.uid()) or public.is_session_player(id));

-- Den som startade en session får ta bort den medan den pågår
-- (t.ex. om den startades av misstag).
create policy "Skaparen tar bort pågående session"
  on public.sessions for delete
  to authenticated
  using (status = 'active' and created_by = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- session_players
-- ---------------------------------------------------------------------------
alter table public.session_players enable row level security;

create policy "Inloggade läser sessionsspelare"
  on public.session_players for select
  to authenticated
  using (true);

-- Den som startade sessionen lägger till spelarna (med slumpade platser).
create policy "Skaparen lägger till spelare"
  on public.session_players for insert
  to authenticated
  with check (
    public.is_session_creator(session_id)
    and public.is_session_active(session_id)
  );

-- Deltagare sparar placering och poäng när sessionen avslutas.
create policy "Deltagare uppdaterar spelare i pågående session"
  on public.session_players for update
  to authenticated
  using (
    public.is_session_active(session_id)
    and (public.is_session_player(session_id) or public.is_session_creator(session_id))
  )
  with check (
    public.is_session_player(session_id) or public.is_session_creator(session_id)
  );

create policy "Skaparen tar bort spelare i pågående session"
  on public.session_players for delete
  to authenticated
  using (
    public.is_session_creator(session_id)
    and public.is_session_active(session_id)
  );

-- ---------------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------------
alter table public.matches enable row level security;

create policy "Inloggade läser matcher"
  on public.matches for select
  to authenticated
  using (true);

create policy "Deltagare registrerar matcher"
  on public.matches for insert
  to authenticated
  with check (
    public.is_session_player(session_id)
    and public.is_session_active(session_id)
  );

create policy "Deltagare redigerar matcher"
  on public.matches for update
  to authenticated
  using (
    public.is_session_player(session_id)
    and public.is_session_active(session_id)
  )
  with check (
    public.is_session_player(session_id)
    and public.is_session_active(session_id)
  );

create policy "Deltagare tar bort matcher"
  on public.matches for delete
  to authenticated
  using (
    public.is_session_player(session_id)
    and public.is_session_active(session_id)
  );

-- ---------------------------------------------------------------------------
-- Begränsad registrering: bara e-postadresser i allowed_emails får bli
-- användare, oavsett om de bjuds in eller registrerar sig själva.
-- Tabellen har RLS utan policyer, så den syns inte via API:t.
-- Lägg till adresser i Supabase SQL Editor:
--   insert into public.allowed_emails (email) values ('namn@example.com');
-- ---------------------------------------------------------------------------
create table public.allowed_emails (
  email text primary key check (email = lower(btrim(email))),
  created_at timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;

-- Användare som redan finns ska inte låsas ute.
insert into public.allowed_emails (email)
select lower(btrim(u.email))
from auth.users u
where u.email is not null
on conflict (email) do nothing;

create function public.enforce_allowed_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or not exists (
    select 1 from public.allowed_emails a
    where a.email = lower(btrim(new.email))
  ) then
    raise exception 'E-postadressen % får inte registreras i appen', new.email
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger enforce_allowed_email
  before insert on auth.users
  for each row execute function public.enforce_allowed_email();
