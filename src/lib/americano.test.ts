import { describe, expect, it } from "vitest";
import {
  assignSlots,
  computeStandings,
  pairingForMatch,
  parseScore,
  teamsForMatch,
  type MatchResult,
} from "./americano";

const slots = { A: "anna", B: "bo", C: "cia", D: "dan" } as const;

describe("rotation", () => {
  it("följer cykeln AB–CD, AC–BD, AD–BC och börjar om", () => {
    expect(pairingForMatch(1)).toEqual([["A", "B"], ["C", "D"]]);
    expect(pairingForMatch(2)).toEqual([["A", "C"], ["B", "D"]]);
    expect(pairingForMatch(3)).toEqual([["A", "D"], ["B", "C"]]);
    expect(pairingForMatch(4)).toEqual(pairingForMatch(1));
    expect(pairingForMatch(8)).toEqual(pairingForMatch(2));
    expect(pairingForMatch(12)).toEqual(pairingForMatch(3));
  });

  it("ger varje spelare varje partner en gång per cykel", () => {
    for (const player of Object.values(slots)) {
      const partners = [1, 2, 3].map((n) => {
        const { team1, team2 } = teamsForMatch(slots, n);
        const team = team1.includes(player) ? team1 : team2;
        return team.find((p) => p !== player);
      });
      expect(new Set(partners).size).toBe(3);
    }
  });

  it("översätter platser till spelare", () => {
    expect(teamsForMatch(slots, 2)).toEqual({
      team1: ["anna", "cia"],
      team2: ["bo", "dan"],
    });
  });

  it("avvisar ogiltiga matchnummer", () => {
    expect(() => pairingForMatch(0)).toThrow();
    expect(() => pairingForMatch(1.5)).toThrow();
  });
});

describe("assignSlots", () => {
  const ids = ["p1", "p2", "p3", "p4"];

  it("placerar alla fyra spelare på var sin plats", () => {
    const result = assignSlots(ids);
    expect(Object.keys(result)).toEqual(["A", "B", "C", "D"]);
    expect([...Object.values(result)].sort()).toEqual(ids);
  });

  it("använder slumpkällan", () => {
    // random() = 0 byter alltid med index 0: [p1,p2,p3,p4] -> [p2,p3,p4,p1]
    expect(assignSlots(ids, () => 0)).toEqual({ A: "p2", B: "p3", C: "p4", D: "p1" });
    // random() nära 1 byter med sig själv: ordningen behålls
    expect(assignSlots(ids, () => 0.999)).toEqual({ A: "p1", B: "p2", C: "p3", D: "p4" });
  });

  it("kräver exakt fyra olika spelare", () => {
    expect(() => assignSlots(ids.slice(0, 3))).toThrow();
    expect(() => assignSlots(["p1", "p1", "p2", "p3"])).toThrow();
  });
});

describe("parseScore", () => {
  it("fyller i motståndarlaget som 24 − x", () => {
    expect(parseScore("15")).toEqual({ team1: 15, team2: 9 });
    expect(parseScore(" 0 ")).toEqual({ team1: 0, team2: 24 });
    expect(parseScore("24")).toEqual({ team1: 24, team2: 0 });
    expect(parseScore("12")).toEqual({ team1: 12, team2: 12 });
  });

  it("avvisar värden utanför 0–24 och annat än heltal", () => {
    for (const bad of ["25", "-1", "", "abc", "7.5", "100", null, undefined]) {
      expect(parseScore(bad)).toBeNull();
    }
  });
});

describe("computeStandings", () => {
  const players = Object.values(slots);
  const match = (n: number, team1Score: number): MatchResult => ({
    ...teamsForMatch(slots, n),
    team1Score,
    team2Score: 24 - team1Score,
  });

  it("ger båda spelarna lagets poäng och räknar vinster, oavgjorda och förluster", () => {
    const table = computeStandings(players, [match(1, 15), match(2, 12)]);
    const byId = Object.fromEntries(table.map((r) => [r.playerId, r]));
    // Match 1: anna+bo 15, cia+dan 9. Match 2: anna+cia 12, bo+dan 12.
    expect(byId.anna).toMatchObject({ points: 27, played: 2, wins: 1, draws: 1, losses: 0 });
    expect(byId.bo).toMatchObject({ points: 27, wins: 1, draws: 1, losses: 0 });
    expect(byId.cia).toMatchObject({ points: 21, wins: 0, draws: 1, losses: 1 });
    expect(byId.dan).toMatchObject({ points: 21, wins: 0, draws: 1, losses: 1 });
  });

  it("sorterar på poäng, sedan vunna matcher, och delar placering vid lika", () => {
    const table = computeStandings(players, [match(1, 15), match(2, 12)]);
    expect(table.map((r) => [r.playerId, r.position])).toEqual([
      ["anna", 1],
      ["bo", 1],
      ["cia", 3],
      ["dan", 3],
    ]);
  });

  it("delar placering när både poäng och vinster är lika", () => {
    // anna+bo 13–11, anna+cia 10–14, anna+dan 13–11
    const table = computeStandings(players, [match(1, 13), match(2, 10), match(3, 13)]);
    expect(table.map((r) => [r.playerId, r.points, r.wins, r.position])).toEqual([
      ["bo", 38, 2, 1],
      ["dan", 38, 2, 1],
      ["anna", 36, 2, 3],
      ["cia", 32, 0, 4],
    ]);
  });

  it("låter fler vunna matcher gå före vid lika poäng", () => {
    // anna+bo 24–0, anna+cia 13–11, anna+dan 6–18, anna+bo 6–18
    const table = computeStandings(players, [
      match(1, 24),
      match(2, 13),
      match(3, 6),
      match(4, 6),
    ]);
    expect(table.map((r) => [r.playerId, r.points, r.wins, r.position])).toEqual([
      ["bo", 59, 2, 1],
      ["cia", 49, 3, 2],
      ["anna", 49, 2, 3],
      ["dan", 35, 1, 4],
    ]);
  });

  it("ger alla plats 1 innan någon match är spelad", () => {
    const table = computeStandings(players, []);
    expect(table.every((r) => r.position === 1 && r.points === 0)).toBe(true);
    expect(table.map((r) => r.playerId)).toEqual(players);
  });
});
