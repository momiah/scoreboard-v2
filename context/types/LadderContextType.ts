import type { LadderHomeCourtState } from "../../helpers/ladderHomeCourt";
import type {
  Court,
  Ladder,
  LadderPlayoffTie,
  LadderMatch,
  LadderMatchInput,
  MatchTeam,
  Game,
  ScoreboardProfile,
  TeamStats,
  TeamMember,
  CreateReportOutcome,
  ReportReason,
  ReportTarget,
  StrikeCounts,
} from "@shared/types";

export type { CreateReportOutcome };
import type { LadderJoinUser } from "@shared/helpers";

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
  registrationClosed?: boolean;
  openMatch?: boolean;
}

export interface TeamLadderActivity {
  hasOpenMatch: boolean;
  hasCompletedGame: boolean;
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

export type UpdateLadderGameFailureReason =
  | "unavailable"
  | "error"
  | "match_decided";

export interface UpdateLadderGameOutcome {
  success: boolean;
  reason?: UpdateLadderGameFailureReason;
}

export type CancelLadderMatchFailureReason =
  | "not_participant"
  | "not_cancellable"
  | "error";

export interface LadderMatchCancellationOutcome {
  success: boolean;
  reason?: CancelLadderMatchFailureReason;
  /** Players to notify: the opponent on a request, the requester's side on a response. */
  notifyUserIds?: string[];
}

export interface CancelLadderMatchOutcome {
  success: boolean;
  reason?: CancelLadderMatchFailureReason;
}

export type ApproveLadderGameFailureReason =
  | "unavailable"
  | "not_opponent"
  | "error";

export interface ApproveLadderGameOutcome {
  success: boolean;
  reason?: ApproveLadderGameFailureReason;
  /** True once the game reached its approval limit and was scored. */
  fullyApproved?: boolean;
  /** True when this approval also completed the match (recent-form written). */
  matchCompleted?: boolean;
}

export type SetLadderHomeCourtFailureReason =
  | "not_participant"
  | "change_limit"
  | "invalid_court"
  | "error";

export interface SetLadderHomeCourtOutcome {
  success: boolean;
  reason?: SetLadderHomeCourtFailureReason;
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
  declineTeamJoinRequest: (teamId: string, userId: string) => Promise<boolean>;
  requestToJoinTeam: (
    teamId: string,
    requester: TeamMember,
  ) => Promise<boolean>;
  withdrawTeamJoinRequest: (teamId: string, userId: string) => Promise<boolean>;
  subscribeToTeamJoinRequest: (
    teamId: string,
    userId: string,
    onUpdate: (exists: boolean) => void,
  ) => () => void;
  subscribeToTeam: (
    teamId: string,
    onUpdate: (team: TeamStats | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  updateTeamProfilePic: (
    teamId: string,
    teamProfilePic: string,
  ) => Promise<boolean>;
  updateTeamDetails: (
    teamId: string,
    updates: { teamName?: string; teamProfilePic?: string },
  ) => Promise<boolean>;
  getTeamLadderActivity: (
    team: TeamStats,
    ladderIds?: string[],
  ) => Promise<TeamLadderActivity>;
  disbandTeam: (team: TeamStats) => Promise<DisbandTeamOutcome>;
  acceptTeamInvite: (teamId: string) => Promise<boolean>;
  declineTeamInvite: (teamId: string, partnerId: string) => Promise<boolean>;
  fetchTeam: (teamKey: string) => Promise<TeamStats | null>;
  fetchUserTeams: (userId: string) => Promise<TeamStats[]>;
  fetchLadderTeamMemberIds: (
    ladderId: string,
    userId: string,
  ) => Promise<string[]>;
  fetchLadderMemberIds: (ladderId: string) => Promise<string[]>;
  joinLadderAsTeam: (
    ladderId: string,
    rootTeam: TeamStats,
  ) => Promise<JoinLadderAsTeamOutcome>;
  createLadderMatch: (
    ladderId: string,
    input: LadderMatchInput,
    userId: string,
    team?: MatchTeam,
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
    team?: MatchTeam,
  ) => Promise<AcceptLadderMatchOutcome>;
  createNoShowClaim: (
    ladderId: string,
    match: LadderMatch,
    claimantUserId: string,
  ) => Promise<CreateReportOutcome>;
  submitReport: (input: {
    ladderId: string;
    ladderName?: string;
    match: LadderMatch;
    reportedBy: string;
    reason: ReportReason;
    target: ReportTarget;
    description?: string;
  }) => Promise<CreateReportOutcome>;
  fetchLadderReportCounts: (
    ladderId: string,
    userIds: string[],
  ) => Promise<Record<string, StrikeCounts>>;
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
  cancelLadderMatch: (args: {
    ladderId: string;
    matchId: string;
    userId: string;
  }) => Promise<CancelLadderMatchOutcome>;
  requestLadderMatchCancellation: (args: {
    ladderId: string;
    matchId: string;
    userId: string;
  }) => Promise<LadderMatchCancellationOutcome>;
  respondToLadderMatchCancellation: (args: {
    ladderId: string;
    matchId: string;
    userId: string;
    accept: boolean;
  }) => Promise<LadderMatchCancellationOutcome>;
  approveLadderGame: (args: {
    ladderId: string;
    matchId: string;
    gameId: string;
    userId: string;
    approver: { userId: string; username: string };
  }) => Promise<ApproveLadderGameOutcome>;
  subscribeToLadderPlayoffTies: (
    ladderId: string,
    onUpdate: (ties: LadderPlayoffTie[]) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  subscribeToLadderHomeCourt: (
    ladder: Pick<Ladder, "ladderId" | "ladderType">,
    userId: string,
    onUpdate: (state: LadderHomeCourtState | null) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  setLadderHomeCourt: (args: {
    ladder: Pick<Ladder, "ladderId" | "ladderType">;
    userId: string;
    court: Court;
  }) => Promise<SetLadderHomeCourtOutcome>;
}

export interface FetchLaddersOptions {
  numberToLoad?: number;
  countryCode?: string | null;
}
