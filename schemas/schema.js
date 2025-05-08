import { createdAt } from "expo-updates";
import { count } from "firebase/firestore";
import moment from "moment";

export const leagueTypes = ["Doubles", "Singles"];
export const privacyTypes = ["Public", "Private"];
export const maxPlayers = [8, 16, 32, 64];
export const leagueStatus = [
  { status: "enlisting", color: "#FAB234" },
  { status: "full", color: "#286EFA" },
  { status: "completed", color: "#167500" },
];

export const prizeTypes = {
  TROPHY: "Trophy",
  MEDAL: "Medal",
  CASH_PRIZE: "Cash Prize",
};
const currencyTypes = ["GBP", "USD", "EUR", "INR"];
const locations = [
  "Milton Keynes",
  "London",
  "Birmingham",
  "Manchester",
  "York",
  "Nottingham",
  "Bath",
  "Glasgow",
  "Edinburgh",
  "Leeds",
];
export const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const locationSchema = {
  city: "",
  country: "",
  countryCode: "",
  postCode: "",
  address: "",
};

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
  location: locationSchema,
  email: "",
  phoneNumber: "",
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
  location: locationSchema,
  centerName: "",
  startDate: "",
  leagueLengthInMonths: "",
  endDate: "",
  image: "",
  leagueType: "",
  prizeType: "",
  currencyType: "",
  entryFee: 0,
  maxPlayers: 0,
  privacy: "",
  playingTime: [],
  pendingInvites: [],
  pendingRequests: [],
};

export const courtSchema = {
  courtName: "",
  courtDescription: "",
  courtImage: "",
  location: locationSchema,
  numberOfLeagues: 0,
  numberOfCourts: 0,
  numberOfTeams: 0,
  numberOfPlayers: 0,
  numberOfGames: 0,
  numberOfTournaments: 0,
};

export const notificationTypes = {
  // Shows information modal
  INFORMATION: {
    APP: "app",
    GENERAL: "general",
    REMINDER: "reminder",
  },
  ACTION: {
    // Shows League/Tournament modal
    INVITE: {
      LEAGUE: "invite-league",
      TOURNAMENT: "invite-tournament",
    },
    // Shows player card
    JOIN_REQUEST: {
      LEAGUE: "join-league-request",
      TOURNAMENT: "join-tournament-request",
    },
    // Shows game modal
    ADD_GAME: {
      LEAGUE: "add-league-game",
      TOURNAMENT: "add-tournament-game",
    },
  },
  RESPONSE: {
    ACCEPT: "accepted",
    DECLINE: "declined",
  },
};

export const notificationSchema = {
  createdAt: new Date(),
  type: "",
  message: "",
  isRead: false,
  senderId: "",
  recipientId: "",
  data: {},
  response: "",
};
