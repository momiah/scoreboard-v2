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
