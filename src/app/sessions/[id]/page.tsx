import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrophyIcon } from "@/components/icons";
import {
  AppPage,
  buttonStyles,
  Card,
  EmptyState,
  PositionBadge,
  SectionTitle,
  Skeleton,
} from "@/components/ui";
import { PAIRINGS, teamsForMatch, type Slot } from "@/lib/americano";
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

export const metadata: Metadata = { title: "Spelkväll · Padel Americano" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const back = { href: "/", label: "Hem" };

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
  const playerBySlot = Object.fromEntries(
    session.players.map((p) => [p.slot, p.id]),
  ) as Record<Slot, string>;
  // De två matcherna efter den som spelas nu, så att man vet vem man ska byta till.
  const upcoming = [1, 2].map((offset) => ({
    matchNumber: next.matchNumber + offset,
    ...teamsForMatch(playerBySlot, next.matchNumber + offset),
  }));

  return (
    <AppPage
      tab="home"
      back={back}
      eyebrow={formatDate(session.startedAt)}
      title={active ? "Spelkväll pågår" : "Spelkvällen är slut"}
    >
      {active && <AutoRefresh />}

      {!active && <Podium session={session} />}

      {canEdit && (
        <Card className="border-2 border-ball-400 p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2 px-1">
            <h2 className="text-xl font-extrabold tracking-tight">Match {next.matchNumber}</h2>
            <span className="text-xs font-medium text-muted">
              {cycleLabel(next.matchNumber)}
            </span>
          </div>
          <ScoreForm
            action={recordMatch.bind(null, session.id, next.matchNumber)}
            team1Label={team(next.team1)}
            team2Label={team(next.team2)}
            submitLabel="Spara"
          />
        </Card>
      )}

      {active && !canEdit && (
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
          Du spelar inte den här kvällen och kan bara följa den.
        </p>
      )}

      {active && (
        <section className="mt-4">
          <ol className="flex flex-col gap-1 px-1 text-sm text-muted">
            {upcoming.map((m) => (
              <li key={m.matchNumber} className="flex gap-2">
                <span className="w-16 shrink-0 font-semibold">Match {m.matchNumber}</span>
                <span className="truncate">
                  {team(m.team1)} mot {team(m.team2)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-8">
        <SectionTitle aside={active ? "Uppdateras automatiskt" : undefined}>
          {active ? "Live-tabell" : "Slutställning"}
        </SectionTitle>
        <StandingsTable session={session} />
      </section>

      <section className="mt-8">
        <SectionTitle aside={session.matches.length > 0 && `${session.matches.length} spelade`}>
          Matcher
        </SectionTitle>
        {session.matches.length === 0 ? (
          <EmptyState>Inga matcher än. Fyll i resultatet när första matchen är klar.</EmptyState>
        ) : (
          <ol className="flex flex-col gap-2">
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
                <li
                  key={m.id}
                  className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3"
                >
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
                      title={`Ta bort match ${m.matchNumber}?`}
                      confirmText="Resultatet försvinner och matchen spelas om nästa gång."
                      confirmLabel="Ta bort matchen"
                      label="Ta bort matchen"
                      pendingLabel="Tar bort…"
                      danger
                      className="self-start px-1 text-sm font-semibold text-danger"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {canEdit && (
        <section className="mt-10 flex flex-col gap-2">
          {session.matches.length > 0 ? (
            <ConfirmButton
              action={endSession.bind(null, session.id)}
              title="Avsluta spelkvällen?"
              confirmText="Placeringarna sparas i statistiken och matcherna går inte längre att ändra."
              confirmLabel="Ja, avsluta"
              label="Avsluta spelkvällen"
              pendingLabel="Avslutar…"
              className={buttonStyles.secondary}
            />
          ) : (
            session.createdBy === userId && (
              <ConfirmButton
                action={deleteSession.bind(null, session.id)}
                title="Ta bort spelkvällen?"
                confirmText="Inga matcher är registrerade, så inget sparas i statistiken."
                confirmLabel="Ta bort"
                label="Ta bort spelkvällen"
                pendingLabel="Tar bort…"
                danger
                className={buttonStyles.danger}
              />
            )
          )}
        </section>
      )}
    </AppPage>
  );
}

// Ett varv är de tre matcherna där alla har spelat med alla en gång.
function cycleLabel(matchNumber: number) {
  const cycle = Math.ceil(matchNumber / PAIRINGS.length);
  const inCycle = ((matchNumber - 1) % PAIRINGS.length) + 1;
  return `Varv ${cycle} · match ${inCycle} av ${PAIRINGS.length}`;
}

function Podium({ session }: { session: SessionDetails }) {
  const names = new Map(session.players.map((p) => [p.id, p.name]));
  const winners = session.standings.filter((s) => s.position === 1);
  if (session.matches.length === 0 || winners.length === 0) return null;
  return (
    <Card className="flex items-center gap-4 border-2 border-gold/60 bg-gradient-to-br from-gold/15 to-transparent p-5">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gold text-court-950">
        <TrophyIcon className="size-7" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          {winners.length > 1 ? "Delad vinst" : "Kvällens vinnare"}
        </p>
        <p className="truncate text-2xl font-extrabold tracking-tight">
          {winners.map((w) => names.get(w.playerId)).join(" & ")}
        </p>
        <p className="text-sm text-muted">
          {winners[0].points} poäng · {winners[0].wins}{" "}
          {winners[0].wins === 1 ? "vunnen match" : "vunna matcher"}
        </p>
      </div>
    </Card>
  );
}

function StandingsTable({ session }: { session: SessionDetails }) {
  const names = new Map(session.players.map((p) => [p.id, p.name]));
  const anyPlayed = session.matches.length > 0;
  return (
    <ol className="overflow-hidden rounded-3xl border border-line bg-surface">
      {session.standings.map((row, i) => (
        <li
          key={row.playerId}
          className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""} ${
            anyPlayed && row.position === 1 ? "bg-ball-400/10" : ""
          }`}
        >
          <PositionBadge position={anyPlayed ? row.position : i + 1} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{names.get(row.playerId)}</p>
            <p className="text-xs text-muted tabular-nums">
              {row.played} {row.played === 1 ? "match" : "matcher"} · {row.wins} V · {row.draws}{" "}
              O · {row.losses} F
            </p>
          </div>
          <p className="text-right tabular-nums">
            <span className="text-2xl font-extrabold">{row.points}</span>
            <span className="ml-0.5 text-xs font-semibold text-muted">p</span>
          </p>
        </li>
      ))}
    </ol>
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
  return (
    <div className="text-sm">
      <span className="text-xs font-semibold text-muted">
        Match {number}
        {team1Score === team2Score && " · oavgjord"}
      </span>
      <TeamLine name={team1} score={team1Score} won={team1Score > team2Score} />
      <TeamLine name={team2} score={team2Score} won={team2Score > team1Score} />
    </div>
  );
}

function TeamLine({ name, score, won }: { name: string; score: number; won: boolean }) {
  return (
    <div className="mt-0.5 flex items-center justify-between gap-2">
      <span className={`flex min-w-0 items-center gap-2 ${won ? "font-bold" : "text-muted"}`}>
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-full ${won ? "bg-ball-500" : "bg-transparent"}`}
        />
        <span className="truncate">{name}</span>
      </span>
      <span className={`text-lg tabular-nums ${won ? "font-extrabold" : "font-semibold text-muted"}`}>
        {score}
      </span>
    </div>
  );
}

export default function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  return (
    <Suspense
      fallback={
        <AppPage tab="home" back={back} title="Spelkväll">
          <Skeleton rows={3} />
        </AppPage>
      }
    >
      <SessionView params={params} />
    </Suspense>
  );
}
