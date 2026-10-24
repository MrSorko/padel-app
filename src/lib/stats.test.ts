import { describe, expect, it } from "vitest";
import type { MatchResult } from "./americano";
import { computePlayerStats, rankPlayers, type FinishedSession } from "./stats";

const players = ["anna", "bo", "cia", "dan"];

const match = (
  team1: [string, string],
  team2: [string, string],
  team1Score: number,
): MatchResult => ({ team1, team2, team1Score, team2Score: 24 - team1Score });

// Kväll 1: anna vinner allt.
const night1: FinishedSession = {
  id: "s1",
  startedAt: "2026-10-01T18:00:00Z",
  matches: [
    match(["anna", "bo"], ["cia", "dan"], 15), // anna, bo vinner
    match(["anna", "cia"], ["bo", "dan"], 14), // anna, cia vinner
    match(["anna", "dan"], ["bo", "cia"], 12), // oavgjort
  ],
  players: [
    { playerId: "anna", finalPosition: 1, totalPoints: 41 },
    { playerId: "bo", finalPosition: 2, totalPoints: 37 },
    { playerId: "cia", finalPosition: 3, totalPoints: 35 },
    { playerId: "dan", finalPosition: 4, totalPoints: 31 },
  ],
};

// Kväll 2: bo och cia delar förstaplatsen.
const night2: FinishedSession = {
  id: "s2",
  startedAt: "2026-10-08T18:00:00Z",
  matches: [match(["bo", "cia"], ["anna", "dan"], 20)],
  players: [
    { playerId: "bo", finalPosition: 1, totalPoints: 20 },
    { playerId: "cia", finalPosition: 1, totalPoints: 20 },
    { playerId: "anna", finalPosition: 3, totalPoints: 4 },
    { playerId: "dan", finalPosition: 3, totalPoints: 4 },
  ],
};

const byId = (sessions: FinishedSession[]) =>
  new Map(computePlayerStats(players, sessions).map((s) => [s.playerId, s]));

describe("statistik per spelare", () => {
  it("räknar spelade, vunna, oavgjorda och förlorade matcher", () => {
    const stats = byId([night1, night2]);
    expect(stats.get("anna")).toMatchObject({ played: 4, wins: 2, draws: 1, losses: 1 });
    expect(stats.get("bo")).toMatchObject({ played: 4, wins: 2, draws: 1, losses: 1 });
    expect(stats.get("dan")).toMatchObject({ played: 4, wins: 0, draws: 1, losses: 3 });
    expect(stats.get("anna")!.winRate).toBe(0.5);
    expect(stats.get("dan")!.winRate).toBe(0);
  });

  it("summerar spelarpoäng och snitt per match", () => {
    const stats = byId([night1, night2]);
    // anna: 15 + 14 + 12 + 4
    expect(stats.get("anna")!.totalPoints).toBe(45);
    expect(stats.get("anna")!.avgPoints).toBe(45 / 4);
    // Alla spelares poäng i en match blir 2 × 24.
    const total = [...stats.values()].reduce((sum, s) => sum + s.totalPoints, 0);
    expect(total).toBe(4 * 2 * 24);
  });

  it("räknar sessioner, placeringar och snittplacering med delade platser", () => {
    const stats = byId([night1, night2]);
    expect(stats.get("anna")).toMatchObject({ sessions: 2, positions: [1, 0, 1, 0] });
    expect(stats.get("anna")!.avgPosition).toBe(2);
    expect(stats.get("bo")).toMatchObject({ positions: [1, 1, 0, 0], avgPosition: 1.5 });
    expect(stats.get("dan")).toMatchObject({ positions: [0, 0, 1, 1], avgPosition: 3.5 });
  });

  it("räknar resultat per partner och sorterar på flest vinster", () => {
    const anna = byId([night1, night2]).get("anna")!;
    expect(anna.partners).toEqual([
      { partnerId: "bo", played: 1, wins: 1, draws: 0, losses: 0, winRate: 1 },
      { partnerId: "cia", played: 1, wins: 1, draws: 0, losses: 0, winRate: 1 },
      { partnerId: "dan", played: 2, wins: 0, draws: 1, losses: 1, winRate: 0 },
    ]);
  });

  it("vid lika många vinster går högre vinstprocent före", () => {
    const extra: FinishedSession = {
      id: "s3",
      startedAt: "2026-10-15T18:00:00Z",
      matches: [
        match(["anna", "bo"], ["cia", "dan"], 10),
        match(["anna", "cia"], ["bo", "dan"], 13),
      ],
      players: night1.players,
    };
    const anna = byId([night1, extra]).get("anna")!;
    // bo: 1 vinst på 2, cia: 2 vinster på 2
    expect(anna.partners.map((p) => p.partnerId)).toEqual(["cia", "bo", "dan"]);
  });

  it("ger nollor och null för en spelare utan matcher", () => {
    const [anna] = computePlayerStats(["anna"], []);
    expect(anna).toEqual({
      playerId: "anna",
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      winRate: null,
      totalPoints: 0,
      avgPoints: null,
      sessions: 0,
      positions: [0, 0, 0, 0],
      avgPosition: null,
      partners: [],
    });
  });

  it("tar med spelare som finns i sessioner men inte i listan", () => {
    const stats = computePlayerStats(["anna"], [night1]);
    expect(stats.map((s) => s.playerId)).toEqual(["anna", "bo", "cia", "dan"]);
  });
});

describe("topplista", () => {
  it("sorterar på vinstprocent, sedan snittplacering", () => {
    const ranked = rankPlayers(computePlayerStats(players, [night1, night2]));
    // anna, bo och cia har 50 %. bo har bäst snittplacering (1,5);
    // anna och cia har båda 2, och cia har fler poäng (55 mot 45).
    expect(ranked.map((s) => s.playerId)).toEqual(["bo", "cia", "anna", "dan"]);
  });

  it("lägger spelare utan matcher sist", () => {
    const ranked = rankPlayers(computePlayerStats(["ny", ...players], [night2]));
    expect(ranked.at(-1)!.playerId).toBe("ny");
  });
});
