import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase.config";
import { baselineProfileDetail } from "./seedRejectGameFlow";
import { seedMatchCancellationFlow } from "./seedMatchCancellationFlow";
import {
  MAESTRO_CANCEL_MATCH_ID,
  CANCEL_VARIANT,
} from "./seedMatchCancellationFlow";

export const MAESTRO_CHAT_LEAGUE_ID = "maestro-chat-league";
export const MAESTRO_CHAT_TOURNAMENT_ID = "maestro-chat-tournament";
export const MAESTRO_CHAT_LEAGUE_NAME = "Maestro Chat League";
export const MAESTRO_CHAT_TOURNAMENT_NAME = "Maestro Chat Tournament";
export const MAESTRO_CHAT_LADDER_NAME = "Ladder match at Maestro Court B Verified";

export const CHAT_VARIANT = {
  TYPED: "typed",
  LEGACY: "legacy",
  EMPTY: "empty",
};

const location = {
  city: "London",
  country: "United Kingdom",
  countryCode: "GB",
  postCode: "E1 1AA",
  address: "1 Maestro Street",
  latitude: 51.5,
  longitude: -0.12,
};

const competitionBase = (testUser) => {
  const owner = {
    userId: testUser.userId,
    firstName: testUser.firstName ?? "",
    lastName: testUser.lastName ?? "",
    username: testUser.username ?? "",
    location,
  };
  const participant = {
    userId: testUser.userId,
    firstName: testUser.firstName ?? "",
    lastName: testUser.lastName ?? "",
    username: testUser.username ?? "",
    profileDetail: baselineProfileDetail(100),
  };
  return { owner, participant };
};

const startDate = "01-10-2026";
const endDate = "01-01-2027";

const shared = (testUser, extra) => {
  const { owner, participant } = competitionBase(testUser);
  return {
    games: [],
    prizeType: "Trophy",
    entryFee: 0,
    currencyType: "GBP",
    location: { ...location, courtName: "Maestro Court", courtId: "maestro-court" },
    countryCode: "GB",
    createdAt: new Date(),
    startDate,
    endDate,
    prizesDistributed: false,
    prizeDistributionDate: null,
    maxPlayers: 8,
    privacy: "Public",
    playingTime: [],
    pendingInvites: [],
    pendingRequests: [],
    approvalLimit: 1,
    participantIds: [testUser.userId],
    clubId: null,
    ...extra,
    __owner: owner,
    __participant: participant,
  };
};

const clearChats = async (testUser) => {
  const snap = await getDocs(collection(db, "users", testUser.userId, "chats"));
  await Promise.all(
    snap.docs
      .filter((d) => d.id.startsWith("maestro-"))
      .map((d) => deleteDoc(d.ref)),
  );
};

export const seedChatsTab = async ({ testUser, variant = CHAT_VARIANT.TYPED }) => {
  if (!testUser?.userId) {
    throw new Error("seedChatsTab: testUser with a userId is required");
  }
  await clearChats(testUser);
  if (variant === CHAT_VARIANT.EMPTY) return { variant };

  const { __owner: leagueOwner, __participant: leagueParticipant, ...leagueBase } =
    shared(testUser, {});
  await setDoc(doc(db, "leagues", MAESTRO_CHAT_LEAGUE_ID), {
    ...leagueBase,
    leagueId: MAESTRO_CHAT_LEAGUE_ID,
    leagueName: MAESTRO_CHAT_LEAGUE_NAME,
    leagueDescription: "Seeded for Maestro. Safe to ignore.",
    leagueImage: "",
    leagueType: "Singles",
    leagueLengthInMonths: "3",
    leagueOwner,
    leagueAdmins: [],
    leagueParticipants: [leagueParticipant],
    leagueTeams: [],
  });
  const {
    __owner: tournamentOwner,
    __participant: tournamentParticipant,
    ...tournamentBase
  } = shared(testUser, {});
  await setDoc(doc(db, "tournaments", MAESTRO_CHAT_TOURNAMENT_ID), {
    ...tournamentBase,
    tournamentId: MAESTRO_CHAT_TOURNAMENT_ID,
    tournamentName: MAESTRO_CHAT_TOURNAMENT_NAME,
    tournamentDescription: "Seeded for Maestro. Safe to ignore.",
    tournamentImage: "",
    tournamentType: "Singles",
    tournamentMode: "Knockout",
    tournamentLengthInMonths: "1",
    tournamentOwner,
    tournamentAdmins: [],
    tournamentParticipants: [tournamentParticipant],
    tournamentTeams: [],
    fixtures: [],
    fixturesGenerated: false,
  });
  await seedMatchCancellationFlow({
    testUser,
    variant: CANCEL_VARIANT.ACCEPTED,
  });

  const typed = variant === CHAT_VARIANT.TYPED;
  const legacyBase = (id, name, minutesAgo) => ({
    type: "chat",
    isRead: false,
    messageCount: 2,
    leagueId: id,
    leagueName: name,
    lastMessage: `opponent: hello from ${name}`,
    createdAt: new Date(Date.now() - minutesAgo * 60000),
  });
  const chatBase = (competitionId, competitionName, minutesAgo, type, extra = {}) => ({
    type: "chat",
    isRead: false,
    messageCount: 2,
    competitionId,
    competitionName,
    lastMessage: `opponent: hello from ${competitionName}`,
    createdAt: new Date(Date.now() - minutesAgo * 60000),
    ...(typed && type ? { competitionType: type } : {}),
    ...extra,
  });
  const legacyChats = [
    [MAESTRO_CHAT_LEAGUE_ID, legacyBase(MAESTRO_CHAT_LEAGUE_ID, MAESTRO_CHAT_LEAGUE_NAME, 1)],
    [
      MAESTRO_CHAT_TOURNAMENT_ID,
      legacyBase(MAESTRO_CHAT_TOURNAMENT_ID, MAESTRO_CHAT_TOURNAMENT_NAME, 2),
    ],
    [
      "maestro-chat-deleted-competition",
      legacyBase("maestro-chat-deleted-competition", "Maestro Deleted Chat", 3),
    ],
  ];
  const chats = !typed ? legacyChats : [
    [MAESTRO_CHAT_LEAGUE_ID, chatBase(MAESTRO_CHAT_LEAGUE_ID, MAESTRO_CHAT_LEAGUE_NAME, 1, "league")],
    [MAESTRO_CHAT_TOURNAMENT_ID, chatBase(MAESTRO_CHAT_TOURNAMENT_ID, MAESTRO_CHAT_TOURNAMENT_NAME, 2, "tournament")],
    [
      MAESTRO_CANCEL_MATCH_ID,
      chatBase(MAESTRO_CANCEL_MATCH_ID, MAESTRO_CHAT_LADDER_NAME, 3, "ladder", {
        ladderId: "maestro-cancel-ladder",
      }),
    ],
  ];
  await Promise.all(
    chats.map(([id, data]) =>
      setDoc(doc(db, "users", testUser.userId, "chats", id), data),
    ),
  );
  return { variant, chats: chats.map(([id]) => id) };
};

export const cleanupChatsTabTestData = async (testUser) => {
  await deleteDoc(doc(db, "leagues", MAESTRO_CHAT_LEAGUE_ID));
  await deleteDoc(doc(db, "tournaments", MAESTRO_CHAT_TOURNAMENT_ID));
  if (testUser?.userId) await clearChats(testUser);
  return { leagues: [MAESTRO_CHAT_LEAGUE_ID], tournaments: [MAESTRO_CHAT_TOURNAMENT_ID] };
};
