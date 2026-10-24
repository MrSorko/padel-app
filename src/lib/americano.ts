// Regler för Americano med fyra spelare (se CLAUDE.md).
// Ren logik utan beroenden till databasen, så att den går att enhetstesta.

export const SLOTS = ["A", "B", "C", "D"] as const;
export type Slot = (typeof SLOTS)[number];

export const MATCH_TOTAL = 24;

// Den fasta cykeln: AB–CD, AC–BD, AD–BC.
export const PAIRINGS: readonly [[Slot, Slot], [Slot, Slot]][] = [
  [
    ["A", "B"],
    ["C", "D"],
  ],
  [
    ["A", "C"],
    ["B", "D"],
  ],
  [
    ["A", "D"],
    ["B", "C"],
  ],
];

/** Parningen för match nummer `matchNumber` (räknas från 1). */
export function pairingForMatch(matchNumber: number) {
  if (!Number.isInteger(matchNumber) || matchNumber < 1) {
    throw new Error(`Ogiltigt matchnummer: ${matchNumber}`);
  }
  return PAIRINGS[(matchNumber - 1) % PAIRINGS.length];
}

export type Teams = { team1: [string, string]; team2: [string, string] };

/** Vilka spelare som möts i en match, givet spelarnas platser A–D. */
export function teamsForMatch(
  playerBySlot: Record<Slot, string>,
  matchNumber: number,
): Teams {
  const [[a, b], [c, d]] = pairingForMatch(matchNumber);
  return {
    team1: [playerBySlot[a], playerBySlot[b]],
    team2: [playerBySlot[c], playerBySlot[d]],
  };
}

/**
 * Slumpar vilka spelare som blir A–D (Fisher–Yates).
 * `random` ger ett tal i [0, 1) och kan bytas ut i tester.
 */
export function assignSlots(
  playerIds: readonly string[],
  random: () => number = Math.random,
): Record<Slot, string> {
  if (playerIds.length !== SLOTS.length || new Set(playerIds).size !== SLOTS.length) {
    throw new Error("En session kräver fyra olika spelare.");
  }
  const shuffled = [...playerIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { A: shuffled[0], B: shuffled[1], C: shuffled[2], D: shuffled[3] };
}

/**
 * Tolkar inmatade poäng för ett lag. Returnerar poängen för båda lagen,
 * eller null om värdet inte är ett heltal mellan 0 och 24.
 */
export function parseScore(input: unknown): { team1: number; team2: number } | null {
  const text = String(input ?? "").trim();
  if (!/^\d{1,2}$/.test(text)) return null;
  const team1 = Number(text);
  if (team1 < 0 || team1 > MATCH_TOTAL) return null;
  return { team1, team2: MATCH_TOTAL - team1 };
}

export type MatchResult = Teams & { team1Score: number; team2Score: number };

export type Standing = {
  playerId: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  /** Placering 1–4. Lika poäng och lika många vinster ger delad placering. */
  position: number;
};

/**
 * Tabellen för en session: sorterad på total spelarpoäng och sedan antal
 * vunna matcher. Spelare som fortfarande är lika delar placering (1, 1, 3, 4).
 * Inbördes ordning mellan delade placeringar följer `playerIds`.
 */
export function computeStandings(
  playerIds: readonly string[],
  matches: readonly MatchResult[],
): Standing[] {
  const rows = new Map<string, Omit<Standing, "position">>(
    playerIds.map((id) => [
      id,
      { playerId: id, points: 0, played: 0, wins: 0, draws: 0, losses: 0 },
    ]),
  );

  const credit = (ids: readonly string[], own: number, other: number) => {
    for (const id of ids) {
      const row = rows.get(id);
      if (!row) continue;
      row.points += own;
      row.played += 1;
      if (own > other) row.wins += 1;
      else if (own < other) row.losses += 1;
      else row.draws += 1;
    }
  };

  for (const m of matches) {
    credit(m.team1, m.team1Score, m.team2Score);
    credit(m.team2, m.team2Score, m.team1Score);
  }

  const order = new Map(playerIds.map((id, i) => [id, i]));
  const sorted = [...rows.values()].sort(
    (x, y) =>
      y.points - x.points ||
      y.wins - x.wins ||
      order.get(x.playerId)! - order.get(y.playerId)!,
  );

  return sorted.map((row, i) => {
    let position = i + 1;
    for (let k = i - 1; k >= 0; k--) {
      if (sorted[k].points === row.points && sorted[k].wins === row.wins) {
        position = k + 1;
      } else {
        break;
      }
    }
    return { ...row, position };
  });
}
