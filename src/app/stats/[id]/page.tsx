import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon } from "@/components/icons";
import {
  AppPage,
  Avatar,
  Card,
  EmptyState,
  ErrorText,
  PositionBadge,
  SectionTitle,
  Skeleton,
} from "@/components/ui";
import { formatDay, formatDecimal, formatPercent } from "@/lib/format";
import { loadFinishedSessions, loadProfiles } from "@/lib/history";
import { requireUser } from "@/lib/sessions";
import { computePlayerStats } from "@/lib/stats";

export const metadata: Metadata = { title: "Spelare · Padel Americano" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const back = { href: "/stats", label: "Statistik" };

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
      <AppPage tab="stats" back={back} title="Spelare">
        <ErrorText>Kunde inte hämta statistiken. Ladda om sidan och försök igen.</ErrorText>
      </AppPage>
    );
  }

  const names = new Map(profiles.map((p) => [p.id, p.name]));
  if (!names.has(id)) notFound();
  const [s] = computePlayerStats([id], sessions);
  const mySessions = sessions.flatMap((session) => {
    const me = session.players.find((p) => p.playerId === id);
    return me ? [{ session, me }] : [];
  });
  const maxPosition = Math.max(1, ...s.positions);
  const bestPartner = s.partners.find((p) => p.wins > 0);

  return (
    <AppPage tab="stats" back={back} eyebrow="Spelare" title={names.get(id)}>
      {s.played === 0 ? (
        <EmptyState>Inga matcher i avslutade spelkvällar än.</EmptyState>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <Tile label="Vinstprocent" value={formatPercent(s.winRate)} highlight />
            <Tile
              label="Matcher V–O–F"
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
              sub={`${s.sessions} ${s.sessions === 1 ? "spelkväll" : "spelkvällar"}`}
            />
          </dl>

          <section className="mt-8">
            <SectionTitle>Placeringar</SectionTitle>
            <Card>
              <ol className="grid grid-cols-4 items-end gap-3 text-center tabular-nums">
                {s.positions.map((count, i) => (
                  <li key={i} className="flex flex-col items-center gap-2">
                    <span className="text-lg font-extrabold">{count}</span>
                    <div className="flex h-20 w-full items-end">
                      <div
                        className={`w-full rounded-t-lg ${
                          ["bg-gold", "bg-silver", "bg-bronze", "bg-surface-2"][i]
                        }`}
                        style={{ height: `${Math.max(6, (count / maxPosition) * 100)}%` }}
                      />
                    </div>
                    <PositionBadge position={i + 1} />
                  </li>
                ))}
              </ol>
            </Card>
          </section>

          <section className="mt-8">
            <SectionTitle>Med partner</SectionTitle>
            {bestPartner && (
              <p className="mb-2 px-1 text-sm text-muted">
                Vinner mest med{" "}
                <span className="font-semibold text-foreground">
                  {names.get(bestPartner.partnerId) ?? "Okänd spelare"}
                </span>
                .
              </p>
            )}
            <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
              {s.partners.map((p, i) => {
                const name = names.get(p.partnerId) ?? "Okänd spelare";
                return (
                  <li
                    key={p.partnerId}
                    className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}
                  >
                    <Avatar name={name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{name}</p>
                      <p className="text-xs text-muted tabular-nums">
                        {p.played} matcher · {p.wins} V · {p.draws} O · {p.losses} F
                      </p>
                    </div>
                    <span className="text-lg font-extrabold tabular-nums">
                      {formatPercent(p.winRate)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {mySessions.length > 0 && (
        <section className="mt-8">
          <SectionTitle>Spelkvällar</SectionTitle>
          <ul className="flex flex-col gap-2">
            {mySessions.map(({ session, me }) => (
              <li key={session.id}>
                <Link
                  href={`/sessions/${session.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 tabular-nums transition active:bg-surface-2"
                >
                  <PositionBadge position={me.finalPosition} />
                  <span className="flex-1">{formatDay(session.startedAt)}</span>
                  <span className="font-semibold">{me.totalPoints} p</span>
                  <ChevronRightIcon className="size-5 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppPage>
  );
}

function Tile({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl p-4 ${
        highlight ? "bg-court-800 text-white" : "border border-line bg-surface"
      }`}
    >
      <dt className={`text-xs font-semibold ${highlight ? "text-court-200" : "text-muted"}`}>
        {label}
      </dt>
      <dd
        className={`mt-1 text-3xl font-extrabold tabular-nums ${highlight ? "text-ball-400" : ""}`}
      >
        {value}
      </dd>
      {sub && (
        <dd className={`text-xs ${highlight ? "text-court-200" : "text-muted"}`}>{sub}</dd>
      )}
    </div>
  );
}

export default function PlayerPage({ params }: PageProps<"/stats/[id]">) {
  return (
    <Suspense
      fallback={
        <AppPage tab="stats" back={back} title="Spelare">
          <Skeleton rows={3} />
        </AppPage>
      }
    >
      <PlayerView params={params} />
    </Suspense>
  );
}
