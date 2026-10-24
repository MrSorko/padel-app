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
