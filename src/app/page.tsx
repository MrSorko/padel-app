import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/sessions";
import { formatDate } from "@/lib/format";
import { signOut } from "./login/actions";

type SessionListRow = {
  id: string;
  status: "active" | "finished";
  started_at: string;
  session_players: {
    slot: string;
    final_position: number | null;
    profiles: { display_name: string } | null;
  }[];
};

async function Sessions() {
  const { supabase, userId } = await requireUser();
  const [{ data: me }, { data, error }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase
      .from("sessions")
      .select("id, status, started_at, session_players(slot, final_position, profiles(display_name))")
      .order("started_at", { ascending: false })
      .limit(10)
      .overrideTypes<SessionListRow[], { merge: false }>(),
  ]);

  if (error) {
    return (
      <p role="alert" className="mt-8 text-red-600 dark:text-red-400">
        Kunde inte hämta sessionerna. Ladda om sidan och försök igen.
      </p>
    );
  }

  const sessions = data ?? [];
  const active = sessions.filter((s) => s.status === "active");
  const finished = sessions.filter((s) => s.status === "finished").slice(0, 5);

  return (
    <>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Inloggad som{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {me?.display_name ?? "okänd"}
        </span>
      </p>

      {active.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Pågående
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {active.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="block rounded-xl border-2 border-emerald-600 px-4 py-3 active:bg-emerald-50 dark:active:bg-emerald-950"
                >
                  <span className="font-semibold">Startad {formatDate(s.started_at)}</span>
                  <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">
                    {playerNames(s)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href="/sessions/new"
        className="mt-8 rounded-lg bg-emerald-600 px-4 py-3 text-center text-base font-semibold text-white active:bg-emerald-700"
      >
        Starta ny session
      </Link>

      <nav className="mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/stats"
          className="rounded-lg border border-zinc-300 px-4 py-3 text-center text-base font-semibold active:bg-zinc-100 dark:border-zinc-700 dark:active:bg-zinc-800"
        >
          Statistik
        </Link>
        <Link
          href="/history"
          className="rounded-lg border border-zinc-300 px-4 py-3 text-center text-base font-semibold active:bg-zinc-100 dark:border-zinc-700 dark:active:bg-zinc-800"
        >
          Historik
        </Link>
      </nav>

      {finished.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Senaste sessionerna
          </h2>
          <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
            {finished.map((s) => (
              <li key={s.id}>
                <Link href={`/sessions/${s.id}`} className="block py-3">
                  <span className="font-medium">{formatDate(s.started_at)}</span>
                  <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">
                    Vinnare: {winners(s)}
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

function playerNames(s: SessionListRow) {
  return [...s.session_players]
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .map((p) => p.profiles?.display_name ?? "?")
    .join(", ");
}

function winners(s: SessionListRow) {
  return (
    s.session_players
      .filter((p) => p.final_position === 1)
      .map((p) => p.profiles?.display_name ?? "?")
      .join(" och ") || "–"
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Padel Americano</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium active:bg-zinc-100 dark:border-zinc-700 dark:active:bg-zinc-800"
          >
            Logga ut
          </button>
        </form>
      </header>
      <Suspense fallback={<p className="mt-8 text-zinc-500">Hämtar sessioner…</p>}>
        <Sessions />
      </Suspense>
    </main>
  );
}
