// Statistik för all tid (se CLAUDE.md, "Statistik").
// Ren logik utan beroenden till databasen, så att den går att enhetstesta.
// Bara avslutade sessioner räknas, så siffrorna ändras inte mitt i en kväll.

import type { MatchResult } from "./americano";

export type FinishedSession = {
  id: string;
  startedAt: string;
  players: { playerId: string; finalPosition: number; totalPoints: number }[];
  matches: MatchResult[];
};

export type Tally = { played: number; wins: number; draws: number; losses: number };

export type PartnerStats = Tally & { partnerId: string; winRate: number | null };

export type PlayerStats = Tally & {
  playerId: string;
  /** Andel vunna matcher, 0–1. null om inga matcher är spelade. */
  winRate: number | null;
  totalPoints: number;
  /** Genomsnittliga spelarpoäng per match. null om inga matcher är spelade. */
  avgPoints: number | null;
  sessions: number;
  /** Antal gånger på plats 1, 2, 3 och 4 (index 0–3). */
  positions: [number, number, number, number];
  avgPosition: number | null;
  /** Partner för partner, flest vinster först. */
  partners: PartnerStats[];
};

const emptyTally = (): Tally => ({ played: 0, wins: 0, draws: 0, losses: 0 });

function addResult(row: Tally, own: number, other: number) {
  row.played += 1;
  if (own > other) row.wins += 1;
  else if (own < other) row.losses += 1;
  else row.draws += 1;
}

const rate = (wins: number, played: number) => (played > 0 ? wins / played : null);

/**
 * Statistik per spelare över alla avslutade sessioner. Spelare i `playerIds`
 * som inte har spelat får en rad med nollor. Ordningen följer `playerIds`.
 */
export function computePlayerStats(
  playerIds: readonly string[],
  sessions: readonly FinishedSession[],
): PlayerStats[] {
  type Acc = Tally & {
    totalPoints: number;
    sessions: number;
    positions: [number, number, number, number];
    partners: Map<string, Tally>;
  };
  const acc = new Map<string, Acc>();
  const get = (id: string) => {
    let row = acc.get(id);
    if (!row) {
      row = {
        ...emptyTally(),
        totalPoints: 0,
        sessions: 0,
        positions: [0, 0, 0, 0],
        partners: new Map(),
      };
      acc.set(id, row);
    }
    return row;
  };
  playerIds.forEach(get);

  for (const session of sessions) {
    for (const p of session.players) {
      const row = get(p.playerId);
      row.sessions += 1;
      if (p.finalPosition >= 1 && p.finalPosition <= 4) {
        row.positions[p.finalPosition - 1] += 1;
      }
    }

    for (const m of session.matches) {
      const sides = [
        [m.team1, m.team1Score, m.team2Score],
        [m.team2, m.team2Score, m.team1Score],
      ] as const;
      for (const [team, own, other] of sides) {
        for (const id of team) {
          const row = get(id);
          addResult(row, own, other);
          row.totalPoints += own;
          const partnerId = team[0] === id ? team[1] : team[0];
          let partner = row.partners.get(partnerId);
          if (!partner) {
            partner = emptyTally();
            row.partners.set(partnerId, partner);
          }
          addResult(partner, own, other);
        }
      }
    }
  }

  const ids = [...playerIds, ...[...acc.keys()].filter((id) => !playerIds.includes(id))];
  return ids.map((playerId) => {
    const row = acc.get(playerId)!;
    const placed = row.positions.reduce((sum, n) => sum + n, 0);
    const positionSum = row.positions.reduce((sum, n, i) => sum + n * (i + 1), 0);
    const partners = [...row.partners.entries()]
      .map(([partnerId, r]) => ({ partnerId, ...r, winRate: rate(r.wins, r.played) }))
      .sort(
        (a, b) => b.wins - a.wins || (b.winRate ?? 0) - (a.winRate ?? 0) || a.played - b.played,
      );
    return {
      playerId,
      played: row.played,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
      winRate: rate(row.wins, row.played),
      totalPoints: row.totalPoints,
      avgPoints: row.played > 0 ? row.totalPoints / row.played : null,
      sessions: row.sessions,
      positions: row.positions,
      avgPosition: placed > 0 ? positionSum / placed : null,
      partners,
    };
  });
}

/** Ordning för topplistan: vinstprocent, sedan snittplacering, sedan namn-ordning. */
export function rankPlayers(stats: readonly PlayerStats[]): PlayerStats[] {
  return [...stats].sort(
    (a, b) =>
      (b.winRate ?? -1) - (a.winRate ?? -1) ||
      (a.avgPosition ?? 5) - (b.avgPosition ?? 5) ||
      b.totalPoints - a.totalPoints,
  );
}
