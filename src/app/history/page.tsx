import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { formatDay } from "@/lib/format";
import { loadFinishedSessions, loadProfiles } from "@/lib/history";
import { requireUser } from "@/lib/sessions";

export const metadata: Metadata = { title: "Historik · Padel Americano" };

async function HistoryList() {
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
        Kunde inte hämta historiken. Ladda om sidan och försök igen.
      </p>
    );
  }

  if (sessions.length === 0) {
    return <p className="mt-6 text-zinc-600 dark:text-zinc-400">Inga avslutade sessioner än.</p>;
  }

  const names = new Map(profiles.map((p) => [p.id, p.name]));

  return (
    <ul className="mt-6 flex flex-col gap-3">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            href={`/sessions/${session.id}`}
            className="block rounded-xl border border-zinc-200 px-4 py-3 active:bg-zinc-100 dark:border-zinc-800 dark:active:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-semibold">{formatDay(session.startedAt)}</span>
              <span className="text-xs text-zinc-500">
                {session.matches.length} {session.matches.length === 1 ? "match" : "matcher"}
              </span>
            </div>
            <ol className="mt-2 text-sm tabular-nums">
              {session.players.map((p) => (
                <li key={p.playerId} className="flex justify-between gap-4 py-0.5">
                  <span className={p.finalPosition === 1 ? "font-semibold" : ""}>
                    {p.finalPosition}. {names.get(p.playerId) ?? "Okänd spelare"}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">{p.totalPoints} p</span>
                </li>
              ))}
            </ol>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function HistoryPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <Link href="/" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
        ← Startsidan
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Historik</h1>
      <Suspense fallback={<p className="mt-6 text-zinc-500">Hämtar historik…</p>}>
        <HistoryList />
      </Suspense>
    </main>
  );
}
