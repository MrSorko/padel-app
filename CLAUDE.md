# Padel Americano-app

En privat webbapp (PWA) för fyra vänner som spelar padel Americano. Den används på mobilen via "Lägg till på hemskärmen" och läggs inte ut på App Store eller Google Play.

## Mål
- Varje spelare har ett eget konto och loggar in.
- Man kan starta en spelkväll (session), föra in poäng match för match och avsluta kvällen.
- Appen sparar statistik över vunna matcher och placeringar per kväll.

## Begrepp (viktigt – använd dessa konsekvent i kod och UI)
- **Match** ("game"): en match 2 mot 2 där lagens poäng alltid blir **24 totalt** (t.ex. 15–9). Laget med flest poäng vinner. 12–12 räknas som oavgjort.
- **Session** ("runda"/spelkväll): flera matcher i följd tills någon avslutar sessionen manuellt. När den avslutas får varje spelare en placering (1–4).
- **Spelarpoäng**: varje spelare får de poäng hennes eller hans lag tog i matchen. Om laget vann med 15–9 får båda spelarna 15 poäng.

## Americano-regler (4 spelare: A, B, C, D)
- Partnerna roterar i en fast cykel med tre parningar:
  1. AB mot CD
  2. AC mot BD
  3. AD mot BC
- Cykeln upprepas tills sessionen avslutas manuellt. Appen har ingen timer och ingen tidsgräns.
- Spelarnas ordning (vem som är A–D) slumpas när sessionen startar.
- Placering vid sessionens slut avgörs av:
  1. total spelarpoäng
  2. antal vunna matcher
  3. delad placering om det fortfarande är lika

## Poänginmatning
- Användaren matar bara in det ena lagets poäng. Det andra fylls i automatiskt (24 − x).
- Validera att poängen ligger mellan 0 och 24.
- En registrerad match ska kunna redigeras så länge sessionen inte är avslutad.
- En pågående session ska visa en live-tabell med poäng och vunna matcher per spelare.

## Statistik (per spelare, för all tid)
- Spelade, vunna, oavgjorda och förlorade matcher samt vinstprocent
- Totala och genomsnittliga poäng per match
- Spelade sessioner
- Antal gånger på plats 1, 2, 3 och 4 samt genomsnittlig placering
- Vinster tillsammans med respektive partner (vem man vinner mest med)
- Historik med lista över tidigare sessioner och deras resultat

## Teknikstack
- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **Supabase** för inloggning (e-post + lösenord) och Postgres-databas
- **Vercel** för hosting (gratisnivån räcker)
- **PWA**: web manifest, ikoner, standalone-läge och mobile-first-design
- Allt UI på **svenska**

## Datamodell (förslag)
- `profiles`: id (= auth.users.id), display_name, created_at
- `sessions`: id, created_by, started_at, ended_at, status ('active' | 'finished')
- `session_players`: session_id, player_id, slot ('A'–'D'), final_position, total_points
- `matches`: id, session_id, match_number, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score, played_at
  - CHECK: team1_score + team2_score = 24
- Statistiken räknas fram med SQL-vyer eller frågor och lagras inte separat, förutom final_position och total_points som sparas när en session avslutas.

## Säkerhet
- Appen är bara för oss fyra. Registrering ska begränsas, antingen med en lista över tillåtna e-postadresser eller genom att stänga av öppen registrering i Supabase och bjuda in användare.
- Använd Row Level Security på alla tabeller:
  - Inloggade användare får läsa allt.
  - Bara deltagare i en session får skriva matcher i den.
- Hemligheter ska ligga i `.env.local`, aldrig i git.

## Arbetssätt
- Bygg i små steg och verifiera varje fas innan nästa börjar.
- Skriv enhetstester för rotationslogik, placeringsberäkning och statistik.
- Committa efter varje fungerande steg.

## Faser
1. Projektsetup (Next.js, Tailwind, Supabase-klient) samt inloggning och utloggning
2. Databasschema, migrationer och RLS
3. Starta session, rotationsschema, poänginmatning, live-tabell och avsluta session
4. Statistiksida och historik
5. PWA (manifest, ikoner) och deploy till Vercel
6. Design och användarvänlighet: finare utseende och smidigare flöden, utifrån hur appen fungerar i verkligheten

## Next.js-version
Se AGENTS.md: projektet kör Next.js 16 (t.ex. heter middleware nu `proxy.ts`). Läs dokumentationen i `node_modules/next/dist/docs/` innan du skriver Next-kod.
