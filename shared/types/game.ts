// types/game.ts

import { Timestamp } from "@google-cloud/firestore";
import { COMPETITION_TYPES } from "@shared";
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

export interface GameTeam {
  player1: Player | null;
  player2: Player | null;
  score?: number | null;
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

export type ApprovalStatus =
  | "Scheduled"
  | "Pending"
  | "pending"
  | "approved"
  | "declined";

export type CompetitionTypes = "Singles" | "Doubles";
export type GenerationType = "Random" | "Balanced";
export type TournamentMode = "Fixed Doubles" | "Mixed Doubles";

export interface Game {
  gameId: string;
  gamescore: string;
  createdAt?: Date;
  date?: string;
  team1: GameTeam;
  team2: GameTeam;
  result: GameResult | null;
  numberOfApprovals: number;
  autoApproved?: boolean;
  numberOfDeclines: number;
  approvalStatus: ApprovalStatus;
  reporter: string;
  court?: number;
  gameNumber?: number;
  createdTime?: string;
  reportedAt?: Date | null;
  reportedTime?: string | null;
  approvers: Approver[];
  videoUrl?: string;
  videoApproved?: boolean | null;
  autoApprovedAt?: Date | null;
}

interface Approver {
  userId: string;
  username: string;
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

export interface FixtureDisclaimer {
  heading: string;
  body: string;
}

export interface FixtureMetadata {
  totalRounds: number;
  totalGames: number;
  estimatedMinutes: number;
  estimatedHours: number;
  disclaimers: FixtureDisclaimer[];
}

export interface FixtureResult {
  fixtures: Fixtures[];
  metadata: FixtureMetadata;
}
