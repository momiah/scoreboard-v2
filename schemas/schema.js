import { type } from "@testing-library/react-native/build/user-event/type";
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

export const ICON_MAP = {
  Instagram: "logo-instagram",
  TikTok: "logo-tiktok",
  // Facebook: "logo-facebook",
};

export const socialMediaPlatforms = [
  "Instagram",
  "TikTok",
  // "Facebook"
];

export const iosAppLinks = {
  Instagram: "instagram://user?username=courtchamps.io",
  TikTok: "snssdk1128://user/profile/7507766818326840342",
  // Facebook: "fb://page/61576837973289",
};

export const androidIntentLinks = {
  Instagram:
    "intent://user?username=courtchamps.io#Intent;package=com.instagram.android;scheme=instagram;end",
  TikTok:
    "intent://user/profile/7507766818326840342#Intent;package=com.zhiliaoapp.musically;scheme=snssdk1128;end",
  // Facebook:
  //   "intent://page/61576837973289#Intent;package=com.facebook.katana;scheme=fb;end",
};

export const fallbackUrls = {
  Instagram: "https://www.instagram.com/courtchamps.io/",
  Facebook: "https://www.facebook.com/profile.php?id=61576837973289",
  TikTok: "https://www.tiktok.com/@courtchamps",
};

export const ccImageEndpoint =
  "https://firebasestorage.googleapis.com/v0/b/scoreboard-app-29148.firebasestorage.app/o/court-champ-logo-icon.png?alt=media&token=226598e8-39ad-441b-a139-b7c56fcfdf6f";

export const prizeTypes = {
  TROPHY: "Trophy",
  MEDAL: "Medal",
  CASH_PRIZE: "Cash Prize",
};
export const currencyTypes = ["GBP", "USD", "EUR", "INR"];
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

export const gameSchema = {
  gameId: "",
  gamescore: "",
  date: "",
  team1: {
    player1: "",
    player2: null,
    score: 0,
  },
  team2: {
    player1: "",
    player2: null,
    score: 0,
  },
  result: "",
  numberOfApprovals: 0,
  numberOfDeclines: 0,
  approvalStatus: "",
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
  memberSince: moment().format("MMM YYYY"),
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
  headline: "",
  profileViews: 0,
  location: locationSchema,
  email: "",
  phoneNumber: "",
};

export const chatMessageSchema = {
  _id: "",
  text: "",
  createdAt: new Date(),
  user: {
    _id: "",
    name: "",
    avatar: "",
  },
};

export const leagueSchema = {
  leagueParticipants: [],
  leagueTeams: [],
  leagueAdmins: [],
  leagueOwner: {
    userId: "",
    username: "",
    firstName: "",
    lastName: "",
    location: locationSchema,
  },
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
  createdAt: new Date(),
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
    APP: {
      ROUTE: "Home",
      TYPE: "app",
    },
    LEAGUE: {
      ROUTE: "League",
      TYPE: "league",
    },
    TOURNAMENT: {
      ROUTE: "Tournament",
      TYPE: "tournament",
    },
    USER: {
      ROUTE: "UserProfile",
      TYPE: "user",
    },
    WELCOME: {
      ROUTE: "Welcome",
      TYPE: "welcome",
    },
  },
  WELCOME: {
    TYPE: "welcome",
    MESSAGE: "Welcome to Court Champs! 🎉",
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

const systemSenderId = "system";

export const notificationSchema = {
  createdAt: new Date(),
  type: "",
  message: "",
  isRead: false,
  senderId: systemSenderId,
  recipientId: "",
  data: {},
  response: "",
};
