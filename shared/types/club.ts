import type {
  CompetitionAdmins,
  CompetitionOwner,
  PendingInvites,
  PendingRequests,
} from "./competition";
import type { Player } from "./game";

/** Root document: `clubs/{clubId}` */
export interface Club {
  clubId: string;
  id?: string;
  clubName: string;
  clubLocation: string;
  clubImage: string;
  clubDescription: string;
  clubOwner: CompetitionOwner;
  clubAdmins: CompetitionAdmins[];
  createdAt: Date;
  pendingInvites: PendingInvites[];
  pendingRequests: PendingRequests[];
}

/** Subcollection `clubs/{clubId}/leagues/{leagueId}` */
export interface ClubLeagueDocument {
  leagueId: string;
  leagueName: string;
  leagueLocation: string;
}

/** Subcollection `clubs/{clubId}/tournaments/{tournamentId}` */
export interface ClubTournamentDocument {
  tournamentId: string;
  tournamentName: string;
  tournamentLocation: string;
}

/** Subcollection `clubs/{clubId}/participants/{userId}` — same shape as `Player`. */
export type ClubParticipantDocument = Player;

/** Kinds of activity surfaced in the club feed. */
export type ClubFeedType =
  | "player_joined"
  | "competition_won"
  | "competition_created";
// future: "game_win" | "game_update" | "announcement"

/** Who/what a feed event is about (denormalized to avoid extra reads). */
export interface ClubFeedActor {
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

/** Optional media attached to a feed event. */
export interface ClubFeedMedia {
  imageUrl?: string;
  videoUrl?: string;
}

/** Subcollection `clubs/{clubId}/feed/{feedId}`. */
export interface ClubFeedDocument {
  id?: string;
  type: ClubFeedType;
  title: string;
  message: string;
  createdAt: Date;
  actor?: ClubFeedActor | null;
  /** Small leading visual (e.g. competition banner). Falls back to actor avatar / icon. */
  thumbnail?: string | null;
  media?: ClubFeedMedia | null;
  icon?: string;
  data?: Record<string, unknown>;
}
