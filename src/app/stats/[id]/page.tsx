import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDay, formatDecimal, formatPercent } from "@/lib/format";
import { loadFinishedSessions, loadProfiles } from "@/lib/history";
import { requireUser } from "@/lib/sessions";
import { computePlayerStats } from "@/lib/stats";

export const metadata: Metadata = { title: "Spelare · Padel Americano" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function PlayerView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { supabase } = await requireUser();
  let profiles, sessions;
  try {
    [profiles, sessions] = await Promise.all([
      loadProfiles(supabase),
      loadFinishedSessions(supabase),
    ]);
  } catch {
    return (
      <p role="alert" className="mt-6 text-red-600 dark:text-red-400">
        Kunde inte hämta statistiken. Ladda om sidan och försök igen.
      </p>
    );
  }

  const names = new Map(profiles.map((p) => [p.id, p.name]));
  if (!names.has(id)) notFound();
  const [s] = computePlayerStats([id], sessions);
  const mySessions = sessions.flatMap((session) => {
    const me = session.players.find((p) => p.playerId === id);
    return me ? [{ session, me }] : [];
  });

  return (
    <>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{names.get(id)}</h1>

      {s.played === 0 ? (
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Inga matcher i avslutade sessioner än.
        </p>
      ) : (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-3">
            <Tile label="Vinstprocent" value={formatPercent(s.winRate)} />
            <Tile
              label="Matcher (V–O–F)"
              value={`${s.wins}–${s.draws}–${s.losses}`}
              sub={`${s.played} spelade`}
            />
            <Tile
              label="Poäng per match"
              value={formatDecimal(s.avgPoints)}
              sub={`${s.totalPoints} totalt`}
            />
            <Tile
              label="Snittplacering"
              value={formatDecimal(s.avgPosition)}
              sub={`${s.sessions} ${s.sessions === 1 ? "session" : "sessioner"}`}
            />
          </dl>

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Placeringar
            </h2>
            <ol className="mt-2 grid grid-cols-4 gap-2 text-center tabular-nums">
              {s.positions.map((count, i) => (
                <li key={i} className="rounded-lg bg-zinc-100 py-2 dark:bg-zinc-900">
                  <span className="block text-xs text-zinc-500">Plats {i + 1}</span>
                  <span className="text-lg font-bold">{count}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Med partner
            </h2>
            <table className="mt-2 w-full text-left tabular-nums">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="py-2 font-medium">Partner</th>
                  <th className="px-1 py-2 text-right font-medium" title="Spelade matcher">
                    M
                  </th>
                  <th className="px-1 py-2 text-right font-medium" title="Vunna">
                    V
                  </th>
                  <th className="px-1 py-2 text-right font-medium" title="Oavgjorda">
                    O
                  </th>
                  <th className="px-1 py-2 text-right font-medium" title="Förlorade">
                    F
                  </th>
                  <th className="py-2 pl-1 text-right font-medium">Vinst</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {s.partners.map((p) => (
                  <tr key={p.partnerId}>
                    <td className="py-3 font-medium">
                      {names.get(p.partnerId) ?? "Okänd spelare"}
                    </td>
                    <td className="px-1 py-3 text-right">{p.played}</td>
                    <td className="px-1 py-3 text-right">{p.wins}</td>
                    <td className="px-1 py-3 text-right">{p.draws}</td>
                    <td className="px-1 py-3 text-right">{p.losses}</td>
                    <td className="py-3 pl-1 text-right font-semibold">
                      {formatPercent(p.winRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {mySessions.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Sessioner</h2>
          <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
            {mySessions.map(({ session, me }) => (
              <li key={session.id}>
                <Link
                  href={`/sessions/${session.id}`}
                  className="flex justify-between gap-4 py-3 tabular-nums"
                >
                  <span>{formatDay(session.startedAt)}</span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Plats {me.finalPosition} · {me.totalPoints} p
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
      {sub && <dd className="text-xs text-zinc-500">{sub}</dd>}
    </div>
  );
}

export default function PlayerPage({ params }: PageProps<"/stats/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <Link href="/stats" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
        ← Statistik
      </Link>
      <Suspense fallback={<p className="mt-6 text-zinc-500">Hämtar statistik…</p>}>
        <PlayerView params={params} />
      </Suspense>
    </main>
  );
}
