import type { Ladder } from "@shared/types";

export interface LadderContextType {
  /** Ladders shown in the Home carousel (newest first). */
  upcomingLadders: Ladder[];
  upcomingLaddersLoading: boolean;
  /** Fetches the carousel list and stores it on the context. */
  fetchUpcomingLadders: () => Promise<void>;
  /** Ad-hoc list fetch (does not touch context state). */
  fetchLadders: (options?: FetchLaddersOptions) => Promise<Ladder[]>;
  /** The ladder currently open on the Ladder screen. */
  ladderById: Ladder | null;
  /** Loads a single ladder by id and stores it as `ladderById`. */
  fetchLadderById: (ladderId: string) => Promise<Ladder | null>;
}

export interface FetchLaddersOptions {
  numberToLoad?: number;
  countryCode?: string | null;
}
