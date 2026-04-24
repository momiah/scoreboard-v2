import { Location, ScoreboardProfile } from "./player";
import { Game, Fixtures } from "./game";
import { COMPETITION_TYPES } from "@shared";

export type CollectionName =
  | "leagues"
  | "tournaments"
  | "pendingVideoUploads"
  | "gameVideos"
  | "comments"
  | "replies";

export type CompetitionType =
  | typeof COMPETITION_TYPES.LEAGUE
  | typeof COMPETITION_TYPES.TOURNAMENT;

export interface CompetitionAdmins {
  userId: string;
  username: string;
}

export interface CompetitionLocation extends Location {
  courtName: string;
  courtId: string;
}

export interface Court {
  id?: string;
  courtName: string;
  courtImage?: string;
  courtDescription?: string;
  location: Location;
  numberOfLeagues?: number;
  numberOfCourts?: number;
  numberOfTeams?: number;
  numberOfPlayers?: number;
  numberOfGames?: number;
  numberOfTournaments?: number;
}

interface CompetitionOwner {
  firstName: string;
  lastName: string;
  username: string;
  userId: string;
  location: Location;
}

export interface PlayingTime {
  day: string;
  endTime: string;
  startTime: string;
}

export interface PendingInvites {
  userId: string;
}

export interface PendingRequests {
  userId: string;
}

interface Rival {
  rivalKey: string;
  rivalPlayers: string[];
}

export interface TeamStats {
  averagePointDifference: number;
  currentStreak: number;
  demonWin: number;
  highestLossStreak: number;
  highestWinStreak: number;
  lossesTo: Record<string, unknown>;
  numberOfGamesPlayed: number;
  numberOfLosses: number;
  numberOfWins: number;
  pointDifferenceLog: number[];
  resultLog: string[];
  rival: Rival | null;
  team: string[];
  teamKey: string;
  totalPointDifference: number;
  winStreak3: number;
  winStreak5: number;
  winStreak7: number;
}

export interface League {
  leagueId?: string;
  id?: string;
  leagueParticipants: ScoreboardProfile[];
  leagueTeams: TeamStats[];
  leagueAdmins: CompetitionAdmins[];
  leagueOwner: CompetitionOwner;
  games: Game[];
  leagueType: string;
  prizeType: string;
  entryFee: number;
  currencyType: string;
  leagueImage: string;
  leagueName: string;
  leagueDescription: string;
  location: CompetitionLocation;
  countryCode: string;
  createdAt: Date;
  startDate: string;
  leagueLengthInMonths: string;
  endDate: string;
  prizesDistributed: boolean;
  prizeDistributionDate: Date | null;
  maxPlayers: number;
  privacy: string;
  playingTime: PlayingTime[];
  pendingInvites: PendingInvites[];
  pendingRequests: PendingRequests[];
  approvalLimit: number;
}

export interface Tournament {
  tournamentId?: string;
  id?: string;
  tournamentParticipants: ScoreboardProfile[];
  tournamentTeams: TeamStats[];
  tournamentAdmins: CompetitionAdmins[];
  tournamentOwner: CompetitionOwner;
  games: Game[];
  fixtures: Fixtures[];
  fixturesGenerated: boolean;
  numberOfGames?: number;
  gamesCompleted?: number;
  tournamentType: string;
  tournamentMode: string;
  prizeType: string;
  entryFee: number;
  currencyType: string;
  tournamentImage: string;
  tournamentName: string;
  tournamentDescription: string;
  location: CompetitionLocation;
  countryCode: string;
  createdAt: Date;
  startDate: string;
  tournamentLengthInMonths: string;
  endDate: string;
  prizesDistributed: boolean;
  prizeDistributionDate: string | null;
  maxPlayers: number;
  privacy: string;
  playingTime: PlayingTime[];
  pendingInvites: PendingInvites[];
  pendingRequests: PendingRequests[];
  approvalLimit: number;
}

export interface NormalizedCompetition {
  participants: ScoreboardProfile[];
  teams: TeamStats[];
  admins: CompetitionAdmins[];
  owner: CompetitionOwner;
  games: Game[];
  fixtures: Fixtures[];
  type: string;
  mode: string;
  prizeType: string;
  entryFee: number;
  currencyType: string;
  image: string;
  name: string;
  description: string;
  location: CompetitionLocation;
  countryCode: string;
  createdAt: Date;
  startDate: string;
  lengthInMonths: string;
  endDate: string;
  prizesDistributed: boolean;
  prizeDistributionDate: string | null;
  maxPlayers: number;
  privacy: string;
  playingTime: PlayingTime[];
  pendingInvites: PendingInvites[];
  pendingRequests: PendingRequests[];
  approvalLimit: number;
  id: string;
}
