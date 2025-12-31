export interface ScoreboardProfile  {
  prevGameXP: number;
  highestLossStreak: number;
  highestWinStreak: number;
  totalPoints: number;
  totalPointDifference: number;
  numberOfWins: number;
  pointEfficiency: number;
  totalPointEfficiency: number;
  winStreak3: number;
  winStreak5: number;
  winStreak7: number;
  demonWin: number;
  pointDifferenceLog: number[];
  averagePointDifference: number;
  resultLog: string[];
  currentStreak: {
      type: string | null; 
      count: number;
    };
    lastActive: string | Date;
    winPercentage: number;
    numberOfLosses: number;
    numberOfGamesPlayed: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    userId?: string;
};

export type PlayersToUpdate = ScoreboardProfile[];

export interface LeagueTournamentStats {
    first: number;
    second: number;
    third: number;
    fourth: number;
}

export interface ProfileDetail extends ScoreboardProfile {
    XP: number;
    memberSince: string;
    leagueStats: LeagueTournamentStats;
    tournamentStats: LeagueTournamentStats;
}

export interface Location {
    city: string;
    country: string;
    countryCode: string;
    postCode: string;
    address: string;
}

export interface UserProfile {
    handPreference: string;
    userId: string;
    lastName: string;
    firstName: string;
    username: string;
    usernameLower: string;
    provider: string;
    dob: string;
    profileDetail: ProfileDetail;
    profileImage: string;
    bio: string;
    headline: string;
    profileViews: number;
    location: Location;
    email: string;
    phoneNumber: string;
    showEmail: boolean;
    showPhoneNumber: boolean;
    pushTokens: string[];
}

export type UsersToUpdate = UserProfile[];


