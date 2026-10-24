import { Suspense } from "react";
import Link from "next/link";
import { BallMark, ChevronRightIcon, LogoutIcon, PlusIcon, TrophyIcon } from "@/components/icons";
import {
  AppPage,
  Avatar,
  buttonStyles,
  Card,
  EmptyState,
  ErrorText,
  SectionTitle,
  Skeleton,
} from "@/components/ui";
import { requireUser } from "@/lib/sessions";
import { formatDate, formatDay } from "@/lib/format";
import { signOut } from "./login/actions";

type SessionListRow = {
  id: string;
  status: "active" | "finished";
  started_at: string;
  session_players: {
    slot: string;
    final_position: number | null;
    total_points: number | null;
    profiles: { display_name: string } | null;
  }[];
  matches: { count: number }[];
};

async function HomeContent() {
  const { supabase, userId } = await requireUser();
  const [{ data: me }, { data, error }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase
      .from("sessions")
      .select(
        "id, status, started_at, session_players(slot, final_position, total_points, profiles(display_name)), matches(count)",
      )
      .order("started_at", { ascending: false })
      .limit(10)
      .overrideTypes<SessionListRow[], { merge: false }>(),
  ]);

  const firstName = me?.display_name?.split(/\s+/)[0];

  return (
    <AppPage
      tab="home"
      eyebrow="Padel Americano"
      title={firstName ? `Hej ${firstName}!` : "Hej!"}
      action={<SignOutButton />}
    >
      {error ? (
        <ErrorText>Kunde inte hämta spelkvällarna. Ladda om sidan och försök igen.</ErrorText>
      ) : (
        <Sessions sessions={data ?? []} />
      )}
    </AppPage>
  );
}

function Sessions({ sessions }: { sessions: SessionListRow[] }) {
  const active = sessions.filter((s) => s.status === "active");
  const finished = sessions.filter((s) => s.status === "finished").slice(0, 5);

  return (
    <>
      {active.length > 0 && (
        <section className="flex flex-col gap-3">
          {active.map((s) => (
            <ActiveSessionCard key={s.id} session={s} />
          ))}
        </section>
      )}

      <Link
        href="/sessions/new"
        className={`${active.length > 0 ? buttonStyles.outline : buttonStyles.primary} ${
          active.length > 0 ? "mt-3" : ""
        }`}
      >
        <PlusIcon className="size-5" />
        {active.length > 0 ? "Starta en till spelkväll" : "Starta spelkväll"}
      </Link>

      <section className="mt-8">
        <SectionTitle aside={finished.length > 0 && <Link href="/history">Visa alla</Link>}>
          Senaste spelkvällarna
        </SectionTitle>
        {finished.length === 0 ? (
          <EmptyState>Inga avslutade spelkvällar än. Dags att spela!</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {finished.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 transition active:bg-surface-2"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                    <TrophyIcon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{winners(s)}</span>
                    <span className="block text-sm text-muted">
                      {formatDay(s.started_at)} · {matchCount(s)}
                    </span>
                  </span>
                  <ChevronRightIcon className="size-5 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ActiveSessionCard({ session }: { session: SessionListRow }) {
  const players = [...session.session_players].sort((a, b) => a.slot.localeCompare(b.slot));
  const played = session.matches[0]?.count ?? 0;
  return (
    <Link href={`/sessions/${session.id}`} className="block transition active:scale-[0.99]">
      <Card className="border-2 border-ball-400 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-ball-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-court-950">
            <span className="size-2 animate-pulse rounded-full bg-court-950" />
            Pågår
          </span>
          <span className="text-sm text-muted">{formatDate(session.started_at)}</span>
        </div>
        <p className="mt-4 text-2xl font-extrabold tracking-tight">
          {played === 0 ? "Redo för första matchen" : `Match ${played + 1} på gång`}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex -space-x-2">
            {players.map((p, i) => (
              <Avatar
                key={i}
                name={p.profiles?.display_name ?? "?"}
                className="size-9 text-xs ring-2 ring-surface"
              />
            ))}
          </div>
          <span className="truncate text-sm text-muted">
            {players.map((p) => p.profiles?.display_name ?? "?").join(", ")}
          </span>
        </div>
        <span className={`mt-5 w-full ${buttonStyles.secondary}`}>
          Fortsätt spelkvällen
          <ChevronRightIcon className="size-5" />
        </span>
      </Card>
    </Link>
  );
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition active:bg-white/20"
      >
        <LogoutIcon className="size-4" />
        Logga ut
      </button>
    </form>
  );
}

function matchCount(s: SessionListRow) {
  const n = s.matches[0]?.count ?? 0;
  return `${n} ${n === 1 ? "match" : "matcher"}`;
}

function winners(s: SessionListRow) {
  const top = s.session_players.filter((p) => p.final_position === 1);
  if (top.length === 0) return "–";
  const names = top.map((p) => p.profiles?.display_name ?? "?").join(" och ");
  const points = top[0].total_points;
  return points === null ? names : `${names} vann (${points} p)`;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <AppPage tab="home" eyebrow="Padel Americano" title={<BallMark className="size-9" />}>
          <Skeleton rows={4} />
        </AppPage>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
