import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import moment from "moment";
import { db } from "../../services/firebase.config";
import {
  LADDER_STATUS,
  LADDER_MATCH_STATUS,
  COMPETITION_TYPES,
  createLadderMatchGames,
  notificationSchema,
  notificationTypes,
} from "@shared";
import { buildLadderCourtSubmission } from "@shared/helpers";
import { toLadderHomeCourt } from "../../helpers/ladderHomeCourt";
import { baselineProfileDetail } from "./seedRejectGameFlow";

export const MAESTRO_HC_LADDER_ID = "maestro-hc-ladder";
export const MAESTRO_HC_DOUBLES_LADDER_ID = "maestro-hc-doubles-ladder";
export const MAESTRO_HC_OTHER_LADDER_ID = "maestro-hc-other-ladder";
export const MAESTRO_HC_MATCH_ID = "maestro-hc-match";
export const MAESTRO_HC_DOUBLES_MATCH_ID = "maestro-hc-doubles-match";

export const MAESTRO_HC_LADDER_NAME = "Maestro Home Court Ladder";
export const MAESTRO_HC_DOUBLES_LADDER_NAME =
  "Maestro Home Court Doubles Ladder";
const OTHER_LADDER_NAME = "Maestro Other Ladder";

export const MAESTRO_HC_OPPONENT_ID = "maestrohcopponent";
export const MAESTRO_HC_OTHER_SUBMITTER_ID = "maestrohcothersubmitter";
export const MAESTRO_HC_PARTNER_ID = "maestrohcpartner";
export const MAESTRO_HC_D_OPP1_ID = "maestrohcdopp1";
export const MAESTRO_HC_D_OPP2_ID = "maestrohcdopp2";

export const MAESTRO_HC_COURT_B_ID = "maestro-hc-court-b";
export const MAESTRO_HC_COURT_D_ID = "maestro-hc-court-d";
export const MAESTRO_HC_COURT_F_ID = "maestro-hc-court-f";
export const MAESTRO_HC_COURT_G_ID = "maestro-hc-court-g";
export const MAESTRO_HC_COURT_H_ID = "maestro-hc-court-h";
export const MAESTRO_HC_COURT_A_SINGLES_ID = "maestro-hc-court-a-singles";
export const MAESTRO_HC_COURT_C_SINGLES_ID = "maestro-hc-court-c-singles";
export const MAESTRO_HC_COURT_A_DOUBLES_ID = "maestro-hc-court-a-doubles";
export const MAESTRO_HC_COURT_E_DOUBLES_ID = "maestro-hc-court-e-doubles";
export const MAESTRO_HC_COURT_C_DOUBLES_ID = "maestro-hc-court-c-doubles";

export const MAESTRO_HC_COURT_NAMES = {
  A: "Maestro Court A Own Pending",
  B: "Maestro Court B Verified",
  C: "Maestro Court C Other Pending",
  E: "Maestro Court E Partner Pending",
  D: "Maestro Court D Verified",
  F: "Maestro Court F Other Ladder Pending",
  G: "Maestro Court G Unverified",
  H: "Maestro Court H Verified Elsewhere",
};

export const MAESTRO_HC_COURT_NAME_PREFIX = "Maestro";
export const MAESTRO_HC_NEW_SUBMISSION_NAME = "Maestro Court New Submission";

export const MAESTRO_HC_EXTRA_COURT_COUNT = 80;
export const maestroHcExtraCourtId = (n) =>
  `maestro-hc-court-extra-${String(n).padStart(2, "0")}`;
const maestroHcExtraCourtName = (n) =>
  `Maestro Extra Court ${String(n).padStart(2, "0")}`;
const EXTRA_COURT_NUMBERS = Array.from(
  { length: MAESTRO_HC_EXTRA_COURT_COUNT },
  (_, i) => i + 1,
);

export const MAESTRO_HC_ALL_COURT_IDS = [
  MAESTRO_HC_COURT_E_DOUBLES_ID,
  ...EXTRA_COURT_NUMBERS.map(maestroHcExtraCourtId),
  MAESTRO_HC_COURT_A_SINGLES_ID,
  MAESTRO_HC_COURT_A_DOUBLES_ID,
  MAESTRO_HC_COURT_B_ID,
  MAESTRO_HC_COURT_C_SINGLES_ID,
  MAESTRO_HC_COURT_C_DOUBLES_ID,
  MAESTRO_HC_COURT_D_ID,
  MAESTRO_HC_COURT_F_ID,
  MAESTRO_HC_COURT_G_ID,
  MAESTRO_HC_COURT_H_ID,
];

export const MAESTRO_HC_LADDER_IDS = [
  MAESTRO_HC_LADDER_ID,
  MAESTRO_HC_DOUBLES_LADDER_ID,
  MAESTRO_HC_OTHER_LADDER_ID,
];

export const MAESTRO_HC_FIXTURE_USER_IDS = [
  MAESTRO_HC_OPPONENT_ID,
  MAESTRO_HC_OTHER_SUBMITTER_ID,
  MAESTRO_HC_PARTNER_ID,
  MAESTRO_HC_D_OPP1_ID,
  MAESTRO_HC_D_OPP2_ID,
];

export const HOME_COURT_VARIANT = {
  NONE: "none",
  SET: "set",
  CHANGE_USED: "changeUsed",
};

const COURT_LOCATION = {
  city: "London",
  country: "United Kingdom",
  countryCode: "GB",
  postCode: "E1 1AA",
  address: "1 Maestro Street",
  latitude: 51.5,
  longitude: -0.12,
};

const UNVERIFIED_LOCATION = {
  ...COURT_LOCATION,
  latitude: null,
  longitude: null,
};

const daysFromNow = (days) => moment().add(days, "days").toDate();

export const seedFixtureUser = (user, email) =>
  setDoc(
    doc(db, "users", user.userId),
    {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      usernameLower: user.username,
      handPreference: "",
      provider: "seed",
      dob: "",
      profileDetail: baselineProfileDetail(100),
      profileImage: "",
      bio: "",
      headline: "",
      profileViews: 0,
      location: {},
      email,
      phoneNumber: "",
      showEmail: false,
      showPhoneNumber: false,
      pushTokens: [],
    },
    { merge: true },
  );

const courtDoc = ({
  courtId,
  courtName,
  verified,
  submittedBy,
  submission,
}) => ({
  courtId,
  courtName,
  location: verified ? COURT_LOCATION : UNVERIFIED_LOCATION,
  verified,
  submittedBy,
  verifiedBy: verified ? "maestro-hc-admin" : null,
  verifiedAt: verified ? new Date() : null,
  createdAt: new Date(),
  ...(submission ? { submittedVia: COMPETITION_TYPES.LADDER, submission } : {}),
});

export const seedHomeCourtCourts = async ({
  testUser,
  ladderId,
  ladderName,
  ownPendingCourtId,
  otherPendingCourtId,
  partnerPendingCourtId,
  extraCourts = 0,
}) => {
  const pending = (submittedBy, username, forLadderId, forLadderName) =>
    buildLadderCourtSubmission({
      submittedBy,
      submittedByUsername: username,
      ladderId: forLadderId,
      ladderName: forLadderName,
    });

  const courts = [
    courtDoc({
      courtId: MAESTRO_HC_COURT_B_ID,
      courtName: MAESTRO_HC_COURT_NAMES.B,
      verified: true,
      submittedBy: MAESTRO_HC_OPPONENT_ID,
    }),
    courtDoc({
      courtId: MAESTRO_HC_COURT_D_ID,
      courtName: MAESTRO_HC_COURT_NAMES.D,
      verified: true,
      submittedBy: MAESTRO_HC_OPPONENT_ID,
    }),
    courtDoc({
      courtId: MAESTRO_HC_COURT_H_ID,
      courtName: MAESTRO_HC_COURT_NAMES.H,
      verified: true,
      submittedBy: MAESTRO_HC_OPPONENT_ID,
    }),
    courtDoc({
      courtId: MAESTRO_HC_COURT_G_ID,
      courtName: MAESTRO_HC_COURT_NAMES.G,
      verified: false,
      submittedBy: MAESTRO_HC_OPPONENT_ID,
    }),
    courtDoc({
      courtId: ownPendingCourtId,
      courtName: MAESTRO_HC_COURT_NAMES.A,
      verified: false,
      submittedBy: testUser.userId,
      submission: pending(
        testUser.userId,
        testUser.username || "",
        ladderId,
        ladderName,
      ),
    }),
    courtDoc({
      courtId: otherPendingCourtId,
      courtName: MAESTRO_HC_COURT_NAMES.C,
      verified: false,
      submittedBy: MAESTRO_HC_OTHER_SUBMITTER_ID,
      submission: pending(
        MAESTRO_HC_OTHER_SUBMITTER_ID,
        "maestro_hc_other_submitter",
        ladderId,
        ladderName,
      ),
    }),
    courtDoc({
      courtId: MAESTRO_HC_COURT_F_ID,
      courtName: MAESTRO_HC_COURT_NAMES.F,
      verified: false,
      submittedBy: MAESTRO_HC_OTHER_SUBMITTER_ID,
      submission: pending(
        MAESTRO_HC_OTHER_SUBMITTER_ID,
        "maestro_hc_other_submitter",
        MAESTRO_HC_OTHER_LADDER_ID,
        OTHER_LADDER_NAME,
      ),
    }),
  ];

  if (partnerPendingCourtId) {
    courts.push(
      courtDoc({
        courtId: partnerPendingCourtId,
        courtName: MAESTRO_HC_COURT_NAMES.E,
        verified: false,
        submittedBy: MAESTRO_HC_PARTNER_ID,
        submission: pending(
          MAESTRO_HC_PARTNER_ID,
          "maestro_hc_partner",
          ladderId,
          ladderName,
        ),
      }),
    );
  }

  const extras = EXTRA_COURT_NUMBERS.slice(0, extraCourts).map((n) =>
    courtDoc({
      courtId: maestroHcExtraCourtId(n),
      courtName: maestroHcExtraCourtName(n),
      verified: true,
      submittedBy: MAESTRO_HC_OPPONENT_ID,
    }),
  );

  await Promise.all(
    [...courts, ...extras].map((court) =>
      setDoc(doc(db, "courts", court.courtId), court),
    ),
  );

  return courts;
};

export const seedHomeCourtLadder = ({
  testUser,
  ladderId,
  ladderName,
  ladderType,
  maxPlayers,
  extraCourts = 0,
  status = LADDER_STATUS.REGISTRATION_OPEN,
}) =>
  setDoc(doc(db, "ladders", ladderId), {
    ladderId,
    name: ladderName,
    description:
      "Seeded by maestro/seeds/seedHomeCourtFlow for Maestro E2E tests. Safe to ignore.",
    image: "",
    region: "Test",
    countryCode: "GB",
    ladderType,
    genderType: "Mixed",
    courtIds: [
      MAESTRO_HC_COURT_B_ID,
      MAESTRO_HC_COURT_D_ID,
      ...EXTRA_COURT_NUMBERS.slice(0, extraCourts).map(maestroHcExtraCourtId),
    ],
    status,
    registrationOpensAt: daysFromNow(-1),
    registrationClosesAt: daysFromNow(7),
    seasonStartsAt: daysFromNow(-1),
    seasonEndsAt: daysFromNow(40),
    playoffStartsAt: daysFromNow(30),
    playoffEndsAt: daysFromNow(40),
    entryFee: 0,
    currencyType: "GBP",
    minRank: 0,
    maxPlayers,
    participantCount: maxPlayers,
    prizesDistributed: false,
    createdBy: testUser.userId,
    createdAt: new Date(),
    updatedBy: testUser.userId,
    updatedAt: new Date(),
  });

const homeCourtSource = (courtId) => ({
  courtId,
  courtName:
    courtId === MAESTRO_HC_COURT_B_ID
      ? MAESTRO_HC_COURT_NAMES.B
      : MAESTRO_HC_COURT_NAMES.D,
  location: COURT_LOCATION,
});

export const homeCourtEntrantFields = (variant) => {
  if (variant === HOME_COURT_VARIANT.SET) {
    return {
      homeCourt: toLadderHomeCourt(homeCourtSource(MAESTRO_HC_COURT_B_ID)),
      homeCourtChanges: 0,
    };
  }
  if (variant === HOME_COURT_VARIANT.CHANGE_USED) {
    return {
      homeCourt: toLadderHomeCourt(homeCourtSource(MAESTRO_HC_COURT_D_ID)),
      homeCourtChanges: 1,
    };
  }
  return {};
};

export const postedMatchDocument = ({
  matchId,
  createdBy,
  participants,
  ladderType,
  teams,
}) => ({
  ladderMatchId: matchId,
  court: {
    courtId: MAESTRO_HC_COURT_B_ID,
    courtName: MAESTRO_HC_COURT_NAMES.B,
    location: COURT_LOCATION,
  },
  bestOf: 3,
  matchDate: moment().add(1, "days").format("DD-MM-YYYY"),
  matchTime: { start: "18:00" },
  courtFee: 0,
  currencyType: "GBP",
  shuttleType: "Feather",
  games: createLadderMatchGames(3, matchId),
  matchStatus: LADDER_MATCH_STATUS.POSTED,
  participants,
  createdBy,
  createdAt: new Date(),
  ladderType,
  ...(teams ? { teams } : {}),
});

export const resetHomeCourtNotifications = async ({
  testUser,
  ladderId,
  ladderName,
}) => {
  const notificationsRef = collection(
    db,
    "users",
    testUser.userId,
    "notifications",
  );
  const stale = await getDocs(
    query(notificationsRef, where("data.ladderId", "==", ladderId)),
  );
  await Promise.all(stale.docs.map((d) => deleteDoc(d.ref)));

  const tabs = [
    { tab: "Summary", message: `Maestro: open ${ladderName} on Summary` },
    {
      tab: "Matchmaking",
      message: `Maestro: open ${ladderName} on Matchmaking`,
    },
  ];
  await Promise.all(
    tabs.map(({ tab, message }) =>
      setDoc(doc(notificationsRef, `maestro-hc-${ladderId}-${tab}`), {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: testUser.userId,
        senderId: "system",
        message,
        type: notificationTypes.INFORMATION.LADDER.TYPE,
        data: { ladderId, tab },
      }),
    ),
  );
};

export const deleteUserSubmittedCourts = async (testUser) => {
  if (!testUser?.userId) return [];
  const snap = await getDocs(
    query(
      collection(db, "courts"),
      where("submittedBy", "==", testUser.userId),
    ),
  );
  const owned = snap.docs.filter((d) =>
    String(d.data().courtName || "").startsWith(MAESTRO_HC_COURT_NAME_PREFIX),
  );
  await Promise.all(owned.map((d) => deleteDoc(d.ref)));
  return owned.map((d) => d.id);
};
