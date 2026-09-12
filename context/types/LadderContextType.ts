import type {
  Ladder,
  LadderMatch,
  LadderMatchInput,
  Game,
  ScoreboardProfile,
  TeamStats,
  TeamMember,
} from "@shared/types";
import type { LadderJoinUser } from "../../helpers/ladderParticipants";

export interface LadderJoinOutcome {
  success: boolean;
  alreadyJoined: boolean;
}

export interface CreateTeamOutcome {
  success: boolean;
  team: TeamStats | null;
}

export interface JoinLadderAsTeamOutcome {
  success: boolean;
  alreadyJoined: boolean;
  conflict: boolean;
  conflictUserIds: string[];
}

export interface DisbandTeamOutcome {
  success: boolean;
  activelyPlaying: boolean;
}

export interface AcceptTeamJoinRequestOutcome {
  success: boolean;
  full: boolean;
}

export interface CreateLadderMatchOutcome {
  success: boolean;
  ladderMatch: LadderMatch | null;
}

export type AcceptLadderMatchFailureReason = "unavailable" | "error";

export interface AcceptLadderMatchOutcome {
  success: boolean;
  reason?: AcceptLadderMatchFailureReason;
}

export type CheckInLadderMatchFailureReason = "unavailable" | "error";

export interface CheckInLadderMatchOutcome {
  success: boolean;
  reason?: CheckInLadderMatchFailureReason;
}

export type UpdateLadderGameFailureReason = "unavailable" | "error";

export interface UpdateLadderGameOutcome {
  success: boolean;
  reason?: UpdateLadderGameFailureReason;
}

export type ApproveLadderGameFailureReason = "unavailable" | "error";

export interface ApproveLadderGameOutcome {
  success: boolean;
  reason?: ApproveLadderGameFailureReason;
  /** True once the game reached its approval limit and was scored. */
  fullyApproved?: boolean;
  /** True when this approval also completed the match (recent-form written). */
  matchCompleted?: boolean;
}

export interface LadderContextType {
  upcomingLadders: Ladder[];
  upcomingLaddersLoading: boolean;
  fetchUpcomingLadders: () => Promise<void>;
  fetchLadders: (options?: FetchLaddersOptions) => Promise<Ladder[]>;
  ladderById: Ladder | null;
  fetchLadderById: (ladderId: string) => Promise<Ladder | null>;
  joinLadder: (
    ladderId: string,
    user: LadderJoinUser,
  ) => Promise<LadderJoinOutcome>;
  joinedLadderIds: string[];
  checkLadderMembership: (ladderId: string, userId: string) => Promise<boolean>;
  fetchLadderParticipants: (ladderId: string) => Promise<ScoreboardProfile[]>;
  addLadderTeam: (ladderId: string, team: TeamStats) => Promise<boolean>;
  fetchLadderTeams: (ladderId: string) => Promise<TeamStats[]>;
  createTeam: (
    creator: TeamMember,
    details: { teamName: string; teamProfilePic?: string },
  ) => Promise<CreateTeamOutcome>;
  addTeamPartner: (teamId: string, partner: TeamMember) => Promise<boolean>;
  acceptTeamJoinRequest: (
    teamId: string,
    requester: TeamMember,
  ) => Promise<AcceptTeamJoinRequestOutcome>;
  updateTeamProfilePic: (
    teamId: string,
    teamProfilePic: string,
  ) => Promise<boolean>;
  updateTeamDetails: (
    teamId: string,
    updates: { teamName?: string; teamProfilePic?: string },
  ) => Promise<boolean>;
  isTeamActivelyPlaying: (team: TeamStats) => Promise<boolean>;
  disbandTeam: (team: TeamStats) => Promise<DisbandTeamOutcome>;
  acceptTeamInvite: (teamId: string) => Promise<boolean>;
  declineTeamInvite: (teamId: string, partnerId: string) => Promise<boolean>;
  fetchTeam: (teamKey: string) => Promise<TeamStats | null>;
  fetchUserTeams: (userId: string) => Promise<TeamStats[]>;
  fetchLadderMemberIds: (ladderId: string) => Promise<string[]>;
  joinLadderAsTeam: (
    ladderId: string,
    rootTeam: TeamStats,
  ) => Promise<JoinLadderAsTeamOutcome>;
  createLadderMatch: (
    ladderId: string,
    input: LadderMatchInput,
    userId: string,
  ) => Promise<CreateLadderMatchOutcome>;
  fetchLadderMatches: (ladderId: string) => Promise<LadderMatch[]>;
  subscribeToLadderMatches: (
    ladderId: string,
    onUpdate: (matches: LadderMatch[]) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  acceptLadderMatch: (
    ladderId: string,
    matchId: string,
    userId: string,
  ) => Promise<AcceptLadderMatchOutcome>;
  checkInLadderMatch: (
    ladderId: string,
    matchId: string,
    userId: string,
  ) => Promise<CheckInLadderMatchOutcome>;
  checkInLadderMatchHandshake: (
    ladderId: string,
    matchId: string,
    scannerId: string,
    displayerId: string,
  ) => Promise<CheckInLadderMatchOutcome>;
  updateLadderGame: (args: {
    ladderId: string;
    matchId: string;
    updatedGame: Game;
  }) => Promise<UpdateLadderGameOutcome>;
  approveLadderGame: (args: {
    ladderId: string;
    matchId: string;
    gameId: string;
    userId: string;
    approver: { userId: string; username: string };
  }) => Promise<ApproveLadderGameOutcome>;
  addCourtToLadder: (ladderId: string, courtId: string) => Promise<boolean>;
}

export interface FetchLaddersOptions {
  numberToLoad?: number;
  countryCode?: string | null;
}
