import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  computeStandings,
  SLOTS,
  teamsForMatch,
  type MatchResult,
  type Slot,
  type Standing,
} from "@/lib/americano";

export type Player = { id: string; name: string; slot: Slot };

export type MatchRow = MatchResult & { id: string; matchNumber: number };

export type SessionDetails = {
  id: string;
  status: "active" | "finished";
  startedAt: string;
  endedAt: string | null;
  createdBy: string;
  players: Player[];
  matches: MatchRow[];
  standings: Standing[];
  nextMatch: { matchNumber: number; team1: [string, string]; team2: [string, string] };
};

/** Supabase-klient och inloggad användare. Skickar till /login annars. */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    redirect("/login");
  }
  return { supabase, userId };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function loadSession(
  supabase: Supabase,
  sessionId: string,
): Promise<SessionDetails | null> {
  const [sessionRes, playersRes, matchesRes] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, status, started_at, ended_at, created_by")
      .eq("id", sessionId)
      .maybeSingle(),
    supabase
      .from("session_players")
      .select("player_id, slot, profiles(display_name)")
      .eq("session_id", sessionId),
    supabase
      .from("matches")
      .select(
        "id, match_number, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score",
      )
      .eq("session_id", sessionId)
      .order("match_number"),
  ]);

  for (const res of [sessionRes, playersRes, matchesRes]) {
    if (res.error) throw new Error(res.error.message);
  }
  const session = sessionRes.data;
  if (!session) return null;

  const players: Player[] = (playersRes.data ?? [])
    .map((row) => ({
      id: row.player_id as string,
      name: profileName(row.profiles),
      slot: row.slot as Slot,
    }))
    .sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));

  if (players.length !== SLOTS.length) {
    throw new Error(`Sessionen har ${players.length} spelare i stället för fyra.`);
  }

  const matches: MatchRow[] = (matchesRes.data ?? []).map((m) => ({
    id: m.id,
    matchNumber: m.match_number,
    team1: [m.team1_p1, m.team1_p2],
    team2: [m.team2_p1, m.team2_p2],
    team1Score: m.team1_score,
    team2Score: m.team2_score,
  }));

  const playerBySlot = Object.fromEntries(players.map((p) => [p.slot, p.id])) as Record<
    Slot,
    string
  >;
  const nextNumber = (matches.at(-1)?.matchNumber ?? 0) + 1;

  return {
    id: session.id,
    status: session.status,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    createdBy: session.created_by,
    players,
    matches,
    standings: computeStandings(
      players.map((p) => p.id),
      matches,
    ),
    nextMatch: { matchNumber: nextNumber, ...teamsForMatch(playerBySlot, nextNumber) },
  };
}

// PostgREST returnerar en inbäddad relation som objekt (många-till-en),
// men typerna är otypade eftersom vi inte genererar databastyper.
function profileName(profiles: unknown): string {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  const name = (profile as { display_name?: string } | null)?.display_name;
  return name ?? "Okänd spelare";
}
