import { Location, ScoreboardProfile } from "./player";
import { Game, Fixtures } from "./game";

interface CompetitionAdmins { 
    userId: string;
    username: string;
}

interface CompetitionOwner {
    firstName: string;
    lastName: string;
    username: string;
    userId: string;
    location: Location;
}

interface PlayingTime {
    day: string;
    endTime: string;
    startTime: string;
}

interface PendingInvites {
    userId: string;
}

interface PendingRequests {
    userId: string;
}

export interface League {
      leagueParticipants: ScoreboardProfile[];
      leagueTeams: string[];
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
      location: Location;
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
      tournamentParticipants: ScoreboardProfile[],
      tournamentTeams: string[],
      tournamentAdmins: CompetitionAdmins[],
      tournamentOwner: CompetitionOwner,
      games: Game[],
      fixtures: Fixtures[],
      tournamentType: string,
      tournamentMode: string,
      prizeType: string,
      entryFee: number,
      currencyType: string,
      tournamentImage: string,
      tournamentName: string,
      tournamentDescription: string,
      location: Location,
      countryCode: string,
      createdAt: Date,
      startDate: string,
      tournamentLengthInMonths: string,
      endDate: string,
      prizesDistributed: boolean,
      prizeDistributionDate: string | null,
      maxPlayers: number,
      privacy: string,
      playingTime: PlayingTime[],
      pendingInvites: PendingInvites[],
      pendingRequests: PendingRequests[],
      approvalLimit: number,
}

