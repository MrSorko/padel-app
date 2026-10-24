"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { assignSlots, parseScore, SLOTS } from "@/lib/americano";
import { loadSession, requireUser } from "@/lib/sessions";

/** `stale` betyder att någon annan hann före och att formuläret ska tömmas. */
export type ActionState = { error: string | null; stale?: boolean };

const OK: ActionState = { error: null };

function dbError(error: PostgrestError, what: string): ActionState {
  if (error.code === "42501") {
    return { error: "Du kan bara ändra i pågående sessioner där du spelar." };
  }
  console.error(`${what} misslyckades:`, error);
  return { error: `${what} misslyckades. Kontrollera anslutningen och försök igen.` };
}

function alreadyRegistered(matchNumber: number) {
  return `Någon annan hann registrera match ${matchNumber}. Tabellen har uppdaterats, kontrollera resultatet.`;
}

export async function startSession(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, userId } = await requireUser();
  const playerIds = [...new Set(formData.getAll("player").map(String))];

  if (playerIds.length !== SLOTS.length) {
    return { error: "Välj exakt fyra spelare." };
  }
  if (!playerIds.includes(userId)) {
    return { error: "Du måste själv vara en av de fyra spelarna." };
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({ created_by: userId })
    .select("id")
    .single();
  if (error) return dbError(error, "Att starta sessionen");

  // Spelarnas ordning (A–D) slumpas när sessionen startar.
  const slots = assignSlots(playerIds, () => randomInt(0, 2 ** 32) / 2 ** 32);
  const { error: playersError } = await supabase.from("session_players").insert(
    SLOTS.map((slot) => ({ session_id: session.id, player_id: slots[slot], slot })),
  );
  if (playersError) {
    await supabase.from("sessions").delete().eq("id", session.id);
    return dbError(playersError, "Att lägga till spelarna");
  }

  redirect(`/sessions/${session.id}`);
}

export async function recordMatch(
  sessionId: string,
  matchNumber: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser();
  const score = parseScore(formData.get("team1_score"));
  if (!score) return { error: "Poängen måste vara ett heltal mellan 0 och 24." };

  const session = await loadSession(supabase, sessionId);
  if (!session || session.status !== "active") {
    refresh();
    return { error: "Sessionen är redan avslutad." };
  }
  // Skyddar mot att två telefoner registrerar samma match samtidigt.
  if (session.nextMatch.matchNumber !== matchNumber) {
    refresh();
    return { error: alreadyRegistered(matchNumber), stale: true };
  }

  const { team1, team2 } = session.nextMatch;
  const { error } = await supabase.from("matches").insert({
    session_id: sessionId,
    match_number: matchNumber,
    team1_p1: team1[0],
    team1_p2: team1[1],
    team2_p1: team2[0],
    team2_p2: team2[1],
    team1_score: score.team1,
    team2_score: score.team2,
  });
  if (error?.code === "23505") {
    refresh();
    return { error: alreadyRegistered(matchNumber), stale: true };
  }
  if (error) return dbError(error, "Att spara matchen");

  refresh();
  return OK;
}

export async function updateMatch(
  sessionId: string,
  matchId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireUser();
  const score = parseScore(formData.get("team1_score"));
  if (!score) return { error: "Poängen måste vara ett heltal mellan 0 och 24." };

  const { data, error } = await supabase
    .from("matches")
    .update({ team1_score: score.team1, team2_score: score.team2 })
    .eq("id", matchId)
    .eq("session_id", sessionId)
    .select("id");
  if (error) return dbError(error, "Att ändra matchen");
  // RLS filtrerar bort raden i stället för att ge ett fel.
  if (!data?.length) {
    refresh();
    return { error: "Matchen kunde inte ändras. Sessionen kan vara avslutad." };
  }

  refresh();
  return OK;
}

export async function deleteLastMatch(
  sessionId: string,
  matchId: string,
): Promise<ActionState> {
  const { supabase } = await requireUser();
  const session = await loadSession(supabase, sessionId);
  if (!session || session.status !== "active" || session.matches.at(-1)?.id !== matchId) {
    refresh();
    return { error: "Bara den senaste matchen i en pågående session kan tas bort." };
  }

  const { data, error } = await supabase
    .from("matches")
    .delete()
    .eq("id", matchId)
    .select("id");
  if (error) return dbError(error, "Att ta bort matchen");
  if (!data?.length) return { error: "Du kan bara ändra i sessioner där du spelar." };

  refresh();
  return OK;
}

export async function endSession(sessionId: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const session = await loadSession(supabase, sessionId);
  if (!session || session.status !== "active") {
    refresh();
    return OK;
  }
  if (session.matches.length === 0) {
    return { error: "Spela minst en match innan sessionen avslutas." };
  }

  // Placeringar sparas först, eftersom spelarraderna låses när sessionen är avslutad.
  const results = await Promise.all(
    session.standings.map((row) =>
      supabase
        .from("session_players")
        .update({ final_position: row.position, total_points: row.points })
        .eq("session_id", sessionId)
        .eq("player_id", row.playerId)
        .select("player_id"),
    ),
  );
  for (const { data, error } of results) {
    if (error) return dbError(error, "Att spara placeringarna");
    if (!data?.length) return { error: "Bara deltagare kan avsluta sessionen." };
  }

  const { data, error } = await supabase
    .from("sessions")
    .update({ status: "finished", ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("status", "active")
    .select("id");
  if (error) return dbError(error, "Att avsluta sessionen");
  if (!data?.length) return { error: "Sessionen kunde inte avslutas." };

  refresh();
  return OK;
}

export async function deleteSession(sessionId: string): Promise<ActionState> {
  const { supabase, userId } = await requireUser();
  const session = await loadSession(supabase, sessionId);
  if (!session || session.status !== "active" || session.createdBy !== userId) {
    return { error: "Bara den som startade sessionen kan ta bort den medan den pågår." };
  }
  if (session.matches.length > 0) {
    return { error: "Sessionen har matcher. Avsluta den i stället." };
  }

  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) return dbError(error, "Att ta bort sessionen");

  redirect("/");
}
