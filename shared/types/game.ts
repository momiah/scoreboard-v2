// types/game.ts

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

interface Teams {
  team1: { player1: Player; player2?: Player };
  team2: { player1: Player; player2?: Player };
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
}

export interface GameVideoUploadPayload {
  gameId: string;
  competitionId: string;
  competitionName: string;
  competitionType:
    | typeof COMPETITION_TYPES.LEAGUE
    | typeof COMPETITION_TYPES.TOURNAMENT;
  videoUrl: string;
  gamescore: string;
  date: string;
  postedBy: VideoPostedBy;
  teams: Teams;
}

export interface VideoPostedBy {
  userId: string;
  firstName: string;
  lastName: string;
  username: string;
  profileImage: string;
}

export interface GameVideo extends GameVideoUploadPayload {
  createdAt: Date;
  likes: number;
  likedBy: string[];
  views: number;
  commentCount: number;
  videoApproved?: boolean | null;
}

export interface Comment {
  commentId: string;
  gameId: string;
  text: string;
  createdAt: Date;
  postedBy: VideoPostedBy;
  likes: number;
  likedBy: string[];
  replyCount: number;
}

export interface GameVideoCommentReply {
  replyId: string;
  commentId: string;
  text: string;
  createdAt: Date;
  postedBy: VideoPostedBy;
  likes: number;
  likedBy: string[];
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
