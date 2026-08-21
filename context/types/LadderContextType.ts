import type {
  Ladder,
  LadderMatch,
  LadderMatchInput,
  ScoreboardProfile,
  TeamStats,
} from "@shared/types";
import type { LadderJoinUser } from "../../helpers/ladderParticipants";

export interface LadderJoinOutcome {
  success: boolean;
  alreadyJoined: boolean;
}

export interface CreateLadderMatchOutcome {
  success: boolean;
  ladderMatch: LadderMatch | null;
}

export interface AcceptLadderMatchOutcome {
  success: boolean;
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
  createLadderMatch: (
    ladderId: string,
    input: LadderMatchInput,
    userId: string,
  ) => Promise<CreateLadderMatchOutcome>;
  fetchLadderMatches: (ladderId: string) => Promise<LadderMatch[]>;
  acceptLadderMatch: (
    ladderId: string,
    matchId: string,
    userId: string,
  ) => Promise<AcceptLadderMatchOutcome>;
  addCourtToLadder: (ladderId: string, courtId: string) => Promise<boolean>;
}

export interface FetchLaddersOptions {
  numberToLoad?: number;
  countryCode?: string | null;
}
