# Padel Americano

Privat PWA för våra Americano-kvällar. Se `CLAUDE.md` för regler, datamodell och faser.

## Kom igång

```bash
npm install
cp .env.example .env.local   # fyll i Supabase-URL och publishable key
npm run dev
```

Öppna http://localhost:3000. Utan inloggning skickas du till `/login`.

## Supabase-inställningar (fas 1)

- **Authentication → Sign In / Providers → Email**: aktiverat, med e-post + lösenord.
- **Authentication → Sign In / Providers**: stäng av *Allow new users to sign up*. Appen har ingen registreringssida.
- **Authentication → Users → Invite user** (eller *Add user* med lösenord): lägg till oss fyra.

## Databas (fas 2)

Migrationerna ligger i `supabase/migrations/` och körs i namnordning:

1. `20261024120000_schema.sql` – tabellerna `profiles`, `sessions`, `session_players` och `matches`, plus en trigger som skapar en profil för varje ny användare.
2. `20261024120100_rls.sql` – Row Level Security på alla tabeller och spärren `allowed_emails`.

Kör dem i **Supabase → SQL Editor** (klistra in en fil i taget och tryck *Run*), eller med Supabase CLI: `supabase link --project-ref <ref>` och `supabase db push`.

### Regler i databasen

- Inloggade får läsa allt. Utloggade (anon) ser ingenting.
- Den som startar en session lägger till de fyra spelarna. Bara deltagare får registrera, redigera och ta bort matcher.
- En match måste ha fyra olika spelare som alla är med i sessionen, poäng 0–24 och summan 24.
- När en session är avslutad (`status = 'finished'`) går varken den, dess spelare eller matcher att ändra.
- Bara e-postadresser i `allowed_emails` kan bli användare, även via inbjudan. Användare som fanns när migrationen kördes läggs till automatiskt. Lägg till fler i SQL Editor innan du bjuder in dem:

  ```sql
  insert into public.allowed_emails (email) values ('namn@example.com');
  ```

- Visningsnamnet tas från user metadata `display_name` om det finns, annars från delen före @. Det kan ändras i `profiles`.

### Testa lokalt

`supabase/tests/run_local.sh` kör migrationerna och RLS-testerna mot en tom, lokal Postgres (med en enkel efterlikning av Supabase auth):

```bash
PGHOST=localhost PGUSER=postgres supabase/tests/run_local.sh
```
