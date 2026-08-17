import type { Ladder } from "@shared/types";
import type { LadderJoinUser } from "../../helpers/ladderParticipants";

export interface LadderJoinOutcome {
  success: boolean;
  alreadyJoined: boolean;
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
}

export interface FetchLaddersOptions {
  numberToLoad?: number;
  countryCode?: string | null;
}
