// types/game.ts

// Base Player type - adjust fields based on your actual player schema
export interface Player {
  userId: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  username: string;
}

export interface PlayerWithXP extends Player {
  XP: number;
}

// Team structure within a game
export interface GameTeam {
  player1: Player | null;
  player2: Player | null;
  score?: number;
}
export interface GameResult {
  winner: {
    team: "Team 1" | "Team 2";
    players: string[];
    score: number;
  };
  loser: {
    team: "Team 1" | "Team 2";
    players: string[];
    score: number;
  };
}

// Approval status options
export type ApprovalStatus =
  | "Scheduled"
  | "Pending"
  | "pending"
  | "Approved"
  | "Declined";

export type CompetitionTypes = "Singles" | "Doubles";
export type GenerationType = "Random" | "Balanced";
export type TournamentMode = "Fixed Doubles" | "Mixed Doubles";

export interface Game {
  gameId: string;
  gamescore: string;
  createdAt?: Date;
  date?: string; // "DD-MM-YYYY"
  team1: GameTeam;
  team2: GameTeam;
  result: GameResult | null;
  numberOfApprovals: number;
  autoApproved?: boolean;
  numberOfDeclines: number;
  approvalStatus: ApprovalStatus;
  reporter: string;
  // Optional tournament-specific fields
  court?: number;
  gameNumber?: number;
  createdTime?: string;
  reportedAt?: Date | null;
  reportedTime?: string | null;
  // status?: GameStatus;
}
export interface Fixtures {
  round: number;
  games: Game[];
}
export interface SelectedPlayers {
  team1: (Player | null)[];
  team2: (Player | null)[];
}
export interface PresetPlayers {
  team1: GameTeam | null;
  team2: GameTeam | null;
}
