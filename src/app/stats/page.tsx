import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { formatDecimal, formatPercent } from "@/lib/format";
import { loadFinishedSessions, loadProfiles } from "@/lib/history";
import { requireUser } from "@/lib/sessions";
import { computePlayerStats, rankPlayers } from "@/lib/stats";

export const metadata: Metadata = { title: "Statistik · Padel Americano" };

async function Leaderboard() {
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
  const stats = rankPlayers(
    computePlayerStats(
      profiles.map((p) => p.id),
      sessions,
    ),
  );

  return (
    <>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {sessions.length === 0
          ? "Inga avslutade sessioner än. Statistiken räknas från avslutade sessioner."
          : `Från ${sessions.length} avslutade ${sessions.length === 1 ? "session" : "sessioner"}. Tryck på en spelare för mer.`}
      </p>

      <table className="mt-4 w-full text-left tabular-nums">
        <thead className="text-xs text-zinc-500">
          <tr>
            <th className="py-2 font-medium">Spelare</th>
            <th className="px-1 py-2 text-right font-medium" title="Spelade matcher">
              M
            </th>
            <th className="px-1 py-2 text-right font-medium">Vinst</th>
            <th className="px-1 py-2 text-right font-medium" title="Poäng per match">
              P/m
            </th>
            <th className="py-2 pl-1 text-right font-medium" title="Snittplacering">
              Plac.
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {stats.map((s) => (
            <tr key={s.playerId}>
              <td className="py-3 font-medium">
                <Link
                  href={`/stats/${s.playerId}`}
                  className="text-emerald-700 underline-offset-2 active:underline dark:text-emerald-400"
                >
                  {names.get(s.playerId) ?? "Okänd spelare"}
                </Link>
              </td>
              <td className="px-1 py-3 text-right">{s.played}</td>
              <td className="px-1 py-3 text-right font-semibold">{formatPercent(s.winRate)}</td>
              <td className="px-1 py-3 text-right">{formatDecimal(s.avgPoints)}</td>
              <td className="py-3 pl-1 text-right">{formatDecimal(s.avgPosition)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Link
        href="/history"
        className="mt-8 rounded-lg border border-zinc-300 px-4 py-3 text-center text-base font-semibold active:bg-zinc-100 dark:border-zinc-700 dark:active:bg-zinc-800"
      >
        Visa historik
      </Link>
    </>
  );
}

export default function StatsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <Link href="/" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
        ← Startsidan
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Statistik</h1>
      <Suspense fallback={<p className="mt-6 text-zinc-500">Hämtar statistik…</p>}>
        <Leaderboard />
      </Suspense>
    </main>
  );
}
