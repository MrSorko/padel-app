import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { AppPage, Avatar, EmptyState, ErrorText, PositionBadge, Skeleton } from "@/components/ui";
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
    return <ErrorText>Kunde inte hämta statistiken. Ladda om sidan och försök igen.</ErrorText>;
  }

  if (sessions.length === 0) {
    return (
      <EmptyState>
        Inga avslutade spelkvällar än. Statistiken räknas från avslutade spelkvällar.
      </EmptyState>
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
      <p className="mb-3 px-1 text-sm text-muted">
        Från {sessions.length} avslutade {sessions.length === 1 ? "spelkväll" : "spelkvällar"},
        rankat på vinstprocent. Tryck på en spelare för mer.
      </p>
      <ol className="flex flex-col gap-2">
        {stats.map((s, i) => {
          const name = names.get(s.playerId) ?? "Okänd spelare";
          return (
            <li key={s.playerId}>
              <Link
                href={`/stats/${s.playerId}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 pr-2 transition active:bg-surface-2"
              >
                <PositionBadge position={i + 1} />
                <Avatar name={name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-bold">{name}</span>
                    <span className="text-lg font-extrabold tabular-nums">
                      {formatPercent(s.winRate)}
                    </span>
                  </div>
                  <WinBar rate={s.winRate} />
                  <p className="mt-1 text-xs text-muted tabular-nums">
                    {s.played} matcher · {formatDecimal(s.avgPoints)} p/match · snittplats{" "}
                    {formatDecimal(s.avgPosition)}
                  </p>
                </div>
                <ChevronRightIcon className="size-5 shrink-0 text-muted" />
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function WinBar({ rate }: { rate: number | null }) {
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full bg-ball-500"
        style={{ width: `${Math.round((rate ?? 0) * 100)}%` }}
      />
    </div>
  );
}

export default function StatsPage() {
  return (
    <AppPage tab="stats" eyebrow="All tid" title="Statistik">
      <Suspense fallback={<Skeleton rows={4} />}>
        <Leaderboard />
      </Suspense>
    </AppPage>
  );
}
