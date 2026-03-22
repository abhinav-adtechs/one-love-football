export type GameStatus = "scheduled" | "in_progress" | "complete";

export interface Player {
  id: string;
  name: string;
  position: string;
  jersey: number;
  attendanceRate: number;
}

export interface Game {
  id: string;
  date: string;
  opponent: string;
  location: string;
  status: GameStatus;
  rosterCount: number;
}

export interface Payment {
  id: string;
  playerId: string;
  amount: number;
  status: "paid" | "due";
  note?: string;
}

export interface LeaderboardEntry {
  playerId: string;
  goals: number;
  assists: number;
  motm: number;
}
