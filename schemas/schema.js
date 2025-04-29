import { count } from "firebase/firestore";
import moment from "moment";

export const scoreboardProfileSchema = {
  prevGameXP: 0,
  highestLossStreak: 0,
  highestWinStreak: 0,
  totalPoints: 0,
  totalPointDifference: 0,
  numberOfWins: 0,
  pointEfficiency: 0,
  totalPointEfficiency: 0,
  winStreak3: 0,
  winStreak5: 0,
  winStreak7: 0,
  demonWin: 0,
  averagePointDifference: 0,
  resultLog: [],
  currentStreak: {
    type: null, // or '' if needed
    count: 0,
  },
  lastActive: "",
  winPercentage: 0,
  numberOfLosses: 0,
  numberOfGamesPlayed: 0,
};

export const profileDetailSchema = {
  ...scoreboardProfileSchema,
  XP: 0,
  memberSince: moment().format("DD-MM-YYYY"),
  leagueStats: {
    first: 0,
    second: 0,
    third: 0,
    fourth: 0,
  },
  tournamentStats: {
    first: 0,
    second: 0,
    third: 0,
    fourth: 0,
  },
};

export const userProfileSchema = {
  handPreference: "",
  userId: "",
  lastName: "",
  firstName: "",
  username: "",
  provider: "",
  dob: "",
  profileDetail: profileDetailSchema,
  profileImage: "",
  bio: "",
  profileViews: 0,
  location: {
    city: "",
    country: "",
    countryCode: "",
  },
  email: "",
};

export const leagueSchema = {
  leagueParticipants: [],
  leagueTeams: [],
  leagueAdmins: [],
  games: [],
  leagueType: "",
  prizeType: "",
  entryFee: 0,
  currencyType: "",
  leagueImage: "",
  leagueName: "",
  leagueDescription: "",
  location: "",
  centerName: "",
  startDate: "",
  leagueLengthInMonths: "",
  endDate: "",
  image: "",
  leagueType: "",
  maxPlayers: 0,
  privacy: "",
  playingTime: [],
};

export const courtSchema = {
  courtName: "",
  courtDescription: "",
  courtImage: "",
  location: {
    city: "",
    country: "",
    countryCode: "",
  },
  postCode: "",
  address: "",
  numberOfLeagues: 0,
  numberOfCourts: 0,
  numberOfTeams: 0,
  numberOfPlayers: 0,
  numberOfGames: 0,
  numberOfTournaments: 0,
};
