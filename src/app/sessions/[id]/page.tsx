import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { loadSession, requireUser, type SessionDetails } from "@/lib/sessions";
import {
  deleteLastMatch,
  deleteSession,
  endSession,
  recordMatch,
  updateMatch,
} from "../actions";
import { ScoreForm } from "./score-form";
import { AutoRefresh, ConfirmButton, EditableMatch } from "./session-controls";

export const metadata: Metadata = { title: "Session · Padel Americano" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function SessionView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { supabase, userId } = await requireUser();
  const session = await loadSession(supabase, id);
  if (!session) notFound();

  const names = new Map(session.players.map((p) => [p.id, p.name]));
  const team = (ids: readonly string[]) => ids.map((p) => names.get(p) ?? "?").join(" & ");
  const active = session.status === "active";
  const canEdit = active && session.players.some((p) => p.id === userId);
  const next = session.nextMatch;
  const lastMatch = session.matches.at(-1);

  return (
    <>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {active ? "Pågående session" : "Avslutad session"}
        </h1>
        <span className="text-sm text-zinc-500">{formatDate(session.startedAt)}</span>
      </div>

      {active && <AutoRefresh />}

      {canEdit && (
        <section className="mt-6 rounded-xl border-2 border-emerald-600 p-4">
          <h2 className="text-lg font-semibold">Match {next.matchNumber}</h2>
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Fyll i ett lags poäng, det andra räknas ut (24 totalt).
          </p>
          <ScoreForm
            action={recordMatch.bind(null, session.id, next.matchNumber)}
            team1Label={team(next.team1)}
            team2Label={team(next.team2)}
            submitLabel="Spara match"
          />
        </section>
      )}

      {active && !canEdit && (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Du spelar inte i den här sessionen och kan bara följa den.
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {active ? "Live-tabell" : "Resultat"}
        </h2>
        <StandingsTable session={session} />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Matcher
        </h2>
        {session.matches.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Inga matcher än.
          </p>
        ) : (
          <ol className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
            {[...session.matches].reverse().map((m) => {
              const summary = (
                <MatchSummary
                  number={m.matchNumber}
                  team1={team(m.team1)}
                  team2={team(m.team2)}
                  team1Score={m.team1Score}
                  team2Score={m.team2Score}
                />
              );
              return (
                <li key={m.id} className="flex flex-col gap-2 py-3">
                  {canEdit ? (
                    <EditableMatch
                      key={`${m.team1Score}`}
                      action={updateMatch.bind(null, session.id, m.id)}
                      team1Label={team(m.team1)}
                      team2Label={team(m.team2)}
                      team1Score={m.team1Score}
                    >
                      {summary}
                    </EditableMatch>
                  ) : (
                    summary
                  )}
                  {canEdit && m.id === lastMatch?.id && (
                    <ConfirmButton
                      action={deleteLastMatch.bind(null, session.id, m.id)}
                      confirmText={`Ta bort match ${m.matchNumber}?`}
                      label="Ta bort matchen"
                      pendingLabel="Tar bort…"
                      className="self-start text-sm font-medium text-red-600 dark:text-red-400"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {canEdit && (
        <section className="mt-10 flex flex-col gap-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          {session.matches.length > 0 ? (
            <ConfirmButton
              action={endSession.bind(null, session.id)}
              confirmText="Avsluta sessionen? Placeringarna sparas och matcherna går inte längre att ändra."
              label="Avsluta session"
              pendingLabel="Avslutar…"
              className="rounded-lg bg-zinc-900 px-4 py-3 text-base font-semibold text-white active:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            />
          ) : (
            session.createdBy === userId && (
              <ConfirmButton
                action={deleteSession.bind(null, session.id)}
                confirmText="Ta bort sessionen?"
                label="Ta bort sessionen"
                pendingLabel="Tar bort…"
                className="rounded-lg border border-red-600 px-4 py-3 text-base font-semibold text-red-600 disabled:opacity-60 dark:border-red-400 dark:text-red-400"
              />
            )
          )}
        </section>
      )}
    </>
  );
}

function StandingsTable({ session }: { session: SessionDetails }) {
  const names = new Map(session.players.map((p) => [p.id, p.name]));
  return (
    <table className="mt-2 w-full text-left tabular-nums">
      <thead className="text-xs text-zinc-500">
        <tr>
          <th className="py-2 pr-2 font-medium">#</th>
          <th className="py-2 font-medium">Spelare</th>
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
          <th className="py-2 pl-2 text-right font-medium">Poäng</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {session.standings.map((row) => (
          <tr key={row.playerId}>
            <td className="py-3 pr-2 font-semibold">{row.position}</td>
            <td className="py-3 font-medium">{names.get(row.playerId)}</td>
            <td className="px-1 py-3 text-right">{row.played}</td>
            <td className="px-1 py-3 text-right">{row.wins}</td>
            <td className="px-1 py-3 text-right">{row.draws}</td>
            <td className="px-1 py-3 text-right">{row.losses}</td>
            <td className="py-3 pl-2 text-right text-lg font-bold">{row.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MatchSummary({
  number,
  team1,
  team2,
  team1Score,
  team2Score,
}: {
  number: number;
  team1: string;
  team2: string;
  team1Score: number;
  team2Score: number;
}) {
  const weight = (own: number, other: number) => (own > other ? "font-semibold" : "");
  return (
    <div className="text-sm">
      <span className="text-xs text-zinc-500">Match {number}</span>
      <div className="flex justify-between gap-2">
        <span className={weight(team1Score, team2Score)}>{team1}</span>
        <span className={`tabular-nums ${weight(team1Score, team2Score)}`}>{team1Score}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span className={weight(team2Score, team1Score)}>{team2}</span>
        <span className={`tabular-nums ${weight(team2Score, team1Score)}`}>{team2Score}</span>
      </div>
    </div>
  );
}

export default function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <Link href="/" className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
        ← Alla sessioner
      </Link>
      <Suspense fallback={<p className="mt-6 text-zinc-500">Hämtar sessionen…</p>}>
        <SessionView params={params} />
      </Suspense>
    </main>
  );
}
