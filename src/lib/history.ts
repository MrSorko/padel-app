import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { FinishedSession } from "@/lib/stats";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type Profile = { id: string; name: string };

export type HistorySession = FinishedSession & { endedAt: string };

type SessionRow = {
  id: string;
  started_at: string;
  ended_at: string;
  session_players: {
    player_id: string;
    final_position: number | null;
    total_points: number | null;
  }[];
  matches: {
    match_number: number;
    team1_p1: string;
    team1_p2: string;
    team2_p1: string;
    team2_p2: string;
    team1_score: number;
    team2_score: number;
  }[];
};

// PostgREST lämnar högst ett visst antal rader per anrop, så vi hämtar i sidor.
const PAGE_SIZE = 200;

/**
 * Alla avslutade sessioner med spelare och matcher, senaste först.
 * Sessioner utan matcher hoppas över, eftersom de inte har några placeringar.
 */
export async function loadFinishedSessions(supabase: Supabase): Promise<HistorySession[]> {
  const rows: SessionRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("sessions")
      .select(
        "id, started_at, ended_at, session_players(player_id, final_position, total_points), matches(match_number, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score)",
      )
      .eq("status", "finished")
      .order("started_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1)
      .overrideTypes<SessionRow[], { merge: false }>();
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  return rows
    .filter((s) => s.matches.length > 0)
    .map((s) => ({
      id: s.id,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      players: s.session_players
        .map((p) => ({
          playerId: p.player_id,
          finalPosition: p.final_position ?? 0,
          totalPoints: p.total_points ?? 0,
        }))
        .sort((a, b) => a.finalPosition - b.finalPosition || b.totalPoints - a.totalPoints),
      matches: [...s.matches]
        .sort((a, b) => a.match_number - b.match_number)
        .map((m) => ({
          team1: [m.team1_p1, m.team1_p2],
          team2: [m.team2_p1, m.team2_p2],
          team1Score: m.team1_score,
          team2Score: m.team2_score,
        })),
    }));
}

/** Alla spelare, sorterade på namn. */
export async function loadProfiles(supabase: Supabase): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({ id: p.id, name: p.display_name }));
}
