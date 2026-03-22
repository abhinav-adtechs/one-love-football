import type { Game, LeaderboardEntry, Payment, Player } from "./types";

export const players: Player[] = [
  { id: "p1", name: "Arjun Patel", position: "Striker", jersey: 9, attendanceRate: 92 },
  { id: "p2", name: "Noah Brooks", position: "Midfielder", jersey: 6, attendanceRate: 87 },
  { id: "p3", name: "Ethan Clarke", position: "Goalkeeper", jersey: 1, attendanceRate: 95 },
  { id: "p4", name: "Leo Mendes", position: "Defender", jersey: 4, attendanceRate: 90 }
];

export const games: Game[] = [
  {
    id: "g1",
    date: "2026-02-14",
    opponent: "Harbor City United",
    location: "Cedar Park",
    status: "scheduled",
    rosterCount: 18
  },
  {
    id: "g2",
    date: "2026-02-01",
    opponent: "Westbrook FC",
    location: "Riverside Arena",
    status: "complete",
    rosterCount: 16
  }
];

export const payments: Payment[] = [
  { id: "pay1", playerId: "p1", amount: 25, status: "paid", note: "January dues" },
  { id: "pay2", playerId: "p2", amount: 25, status: "due", note: "January dues" },
  { id: "pay3", playerId: "p3", amount: 25, status: "paid", note: "January dues" }
];

export const leaderboard: LeaderboardEntry[] = [
  { playerId: "p1", goals: 6, assists: 2, motm: 3 },
  { playerId: "p2", goals: 3, assists: 5, motm: 1 },
  { playerId: "p4", goals: 1, assists: 4, motm: 2 }
];
