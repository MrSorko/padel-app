import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { AppPage, EmptyState, ErrorText, PositionBadge, Skeleton } from "@/components/ui";
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
    return <ErrorText>Kunde inte hämta historiken. Ladda om sidan och försök igen.</ErrorText>;
  }

  if (sessions.length === 0) {
    return <EmptyState>Inga avslutade spelkvällar än.</EmptyState>;
  }

  const names = new Map(profiles.map((p) => [p.id, p.name]));

  return (
    <ul className="flex flex-col gap-3">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            href={`/sessions/${session.id}`}
            className="block rounded-3xl border border-line bg-surface p-4 transition active:bg-surface-2"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-bold">{formatDay(session.startedAt)}</span>
              <span className="flex items-center gap-1 text-xs text-muted">
                {session.matches.length} {session.matches.length === 1 ? "match" : "matcher"}
                <ChevronRightIcon className="size-4" />
              </span>
            </div>
            <ol className="mt-3 flex flex-col gap-1.5 text-sm tabular-nums">
              {session.players.map((p) => (
                <li key={p.playerId} className="flex items-center gap-2.5">
                  <PositionBadge position={p.finalPosition} />
                  <span className={`flex-1 ${p.finalPosition === 1 ? "font-bold" : ""}`}>
                    {names.get(p.playerId) ?? "Okänd spelare"}
                  </span>
                  <span className="font-semibold text-muted">{p.totalPoints} p</span>
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
    <AppPage tab="history" eyebrow="Alla spelkvällar" title="Historik">
      <Suspense fallback={<Skeleton rows={3} />}>
        <HistoryList />
      </Suspense>
    </AppPage>
  );
}
