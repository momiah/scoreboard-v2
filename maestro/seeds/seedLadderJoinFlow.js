import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  LADDER_STATUS,
  LADDER_TYPE,
  TEAM_STATUS,
  buildLadderParticipant,
  normalizeTeamKey,
} from "@shared";
import { buildSeedLadderTeam } from "./buildSeedLadderTeam";
import { deleteAllMaestroFixtureTeams } from "./teamFixtures";
import { resetHomeCourtNotifications, seedFixtureUser } from "./homeCourtFixtures";

export const MAESTRO_JOIN_SINGLES_LADDER_ID = "maestro-join-singles-ladder";
export const MAESTRO_JOIN_DOUBLES_LADDER_ID = "maestro-join-doubles-ladder";
export const MAESTRO_JOIN_LADDER_IDS = [
  MAESTRO_JOIN_SINGLES_LADDER_ID,
  MAESTRO_JOIN_DOUBLES_LADDER_ID,
];
export const MAESTRO_JOIN_SINGLES_LADDER_NAME = "Maestro Join Singles";
export const MAESTRO_JOIN_DOUBLES_LADDER_NAME = "Maestro Join Doubles";
export const MAESTRO_JOIN_PARTNER_A_ID = "maestro-join-partner-a";
export const MAESTRO_JOIN_PARTNER_B_ID = "maestro-join-partner-b";
export const MAESTRO_JOIN_OTHER_ID = "maestro-join-other";
export const MAESTRO_JOIN_FIXTURE_USER_IDS = [
  MAESTRO_JOIN_PARTNER_A_ID,
  MAESTRO_JOIN_PARTNER_B_ID,
  MAESTRO_JOIN_OTHER_ID,
];

const FIXTURE_TAG = "join";
const GHOST_TEAM_KEY = "maestro-join-ghost-team";
const LADDER_SUBCOLLECTIONS = [
  "ladderMatches",
  "ladderParticipants",
  "ladderTeams",
  "ladderMembers",
];

export const JOIN_VARIANT = {
  OPEN: "open",
  FULL: "full",
  WINDOW_CLOSED: "windowClosed",
  STATUS_CLOSED: "statusClosed",
  PARTNER_IN_LADDER: "partnerInLadder",
  CLAIM_RACE: "claimRace",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days) => new Date(Date.now() + days * DAY_MS);

const partnerA = {
  userId: MAESTRO_JOIN_PARTNER_A_ID,
  firstName: "Maestro",
  lastName: "PartnerA",
  username: "maestro_join_partner_a",
};
const partnerB = {
  userId: MAESTRO_JOIN_PARTNER_B_ID,
  firstName: "Maestro",
  lastName: "PartnerB",
  username: "maestro_join_partner_b",
};
const other = {
  userId: MAESTRO_JOIN_OTHER_ID,
  firstName: "Maestro",
  lastName: "Other",
  username: "maestro_join_other",
};

const deleteAllDocs = async (colRef) => {
  const snap = await getDocs(colRef);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

const resetLadderTree = async (ladderId) => {
  await Promise.all(
    LADDER_SUBCOLLECTIONS.map((sub) =>
      deleteAllDocs(collection(db, "ladders", ladderId, sub)),
    ),
  );
};


const ladderDocument = ({ testUser, ladderId, name, ladderType, variant }) => {
  const full = variant === JOIN_VARIANT.FULL;
  const maxPlayers = full ? 8 : 2048;
  const inLadder = variant === JOIN_VARIANT.PARTNER_IN_LADDER ? 1 : 0;
  return {
    ladderId,
    name,
    description:
      "Seeded by maestro/seeds/seedLadderJoinFlow for Maestro E2E tests. Safe to ignore.",
    image: "",
    region: "Test",
    countryCode: "GB",
    ladderType,
    genderType: "Mixed",
    courtIds: [],
    status:
      variant === JOIN_VARIANT.STATUS_CLOSED
        ? LADDER_STATUS.REGISTRATION_CLOSED
        : LADDER_STATUS.REGISTRATION_OPEN,
    registrationOpensAt: daysFromNow(-5),
    registrationClosesAt:
      variant === JOIN_VARIANT.WINDOW_CLOSED
        ? new Date(Date.now() - 60 * 1000)
        : daysFromNow(7),
    seasonStartsAt: daysFromNow(-5),
    seasonEndsAt: daysFromNow(60),
    playoffStartsAt: daysFromNow(50),
    playoffEndsAt: daysFromNow(60),
    entryFee: 0,
    currencyType: "GBP",
    minRank: 0,
    maxPlayers,
    participantCount: full ? maxPlayers : inLadder,
    prizesDistributed: false,
    createdBy: testUser.userId,
    createdAt: new Date(),
    updatedBy: testUser.userId,
    updatedAt: new Date(),
  };
};

export const seedLadderJoinFlowSingles = async ({
  testUser,
  variant = JOIN_VARIANT.OPEN,
}) => {
  if (!testUser?.userId) {
    throw new Error("seedLadderJoinFlowSingles: testUser with a userId is required");
  }
  await resetLadderTree(MAESTRO_JOIN_SINGLES_LADDER_ID);
  await setDoc(
    doc(db, "ladders", MAESTRO_JOIN_SINGLES_LADDER_ID),
    ladderDocument({
      testUser,
      ladderId: MAESTRO_JOIN_SINGLES_LADDER_ID,
      name: MAESTRO_JOIN_SINGLES_LADDER_NAME,
      ladderType: LADDER_TYPE.SINGLES,
      variant,
    }),
  );
  await resetHomeCourtNotifications({
    testUser,
    ladderId: MAESTRO_JOIN_SINGLES_LADDER_ID,
    ladderName: MAESTRO_JOIN_SINGLES_LADDER_NAME,
  });
  return { ladderId: MAESTRO_JOIN_SINGLES_LADDER_ID, variant };
};

export const seedLadderJoinFlowDoubles = async ({
  testUser,
  variant = JOIN_VARIANT.OPEN,
}) => {
  if (!testUser?.userId) {
    throw new Error("seedLadderJoinFlowDoubles: testUser with a userId is required");
  }

  await Promise.all([
    seedFixtureUser(partnerA, "maestro-join-partner-a@example.com"),
    seedFixtureUser(partnerB, "maestro-join-partner-b@example.com"),
    seedFixtureUser(other, "maestro-join-other@example.com"),
  ]);

  await resetLadderTree(MAESTRO_JOIN_DOUBLES_LADDER_ID);
  await deleteAllMaestroFixtureTeams();

  await setDoc(
    doc(db, "ladders", MAESTRO_JOIN_DOUBLES_LADDER_ID),
    ladderDocument({
      testUser,
      ladderId: MAESTRO_JOIN_DOUBLES_LADDER_ID,
      name: MAESTRO_JOIN_DOUBLES_LADDER_NAME,
      ladderType: LADDER_TYPE.DOUBLES,
      variant,
    }),
  );

  const activeTeam = {
    ...buildSeedLadderTeam({
      players: [testUser, partnerA],
      createdBy: testUser,
      teamName: "Maestro Join Aces",
    }),
    maestroFixture: FIXTURE_TAG,
  };
  const pendingTeam = {
    ...buildSeedLadderTeam({
      players: [testUser, partnerB],
      createdBy: testUser,
      teamName: "Maestro Join Pending",
    }),
    status: TEAM_STATUS.PENDING,
    maestroFixture: FIXTURE_TAG,
  };
  const soloTeam = {
    ...buildSeedLadderTeam({
      players: [testUser],
      createdBy: testUser,
      teamName: "Maestro Join Solo",
    }),
    status: TEAM_STATUS.PENDING,
    maestroFixture: FIXTURE_TAG,
  };
  await Promise.all(
    [activeTeam, pendingTeam, soloTeam].map((team) =>
      setDoc(doc(db, "teams", team.teamId), team),
    ),
  );

  if (variant === JOIN_VARIANT.PARTNER_IN_LADDER) {
    const rivalKey = normalizeTeamKey([partnerA.userId, other.userId]);
    const rivalTeam = buildSeedLadderTeam({
      players: [partnerA, other],
      createdBy: partnerA,
      teamName: "Maestro Join Rivals",
    });
    await setDoc(
      doc(db, "ladders", MAESTRO_JOIN_DOUBLES_LADDER_ID, "ladderTeams", rivalKey),
      rivalTeam,
    );
    await Promise.all(
      [partnerA, other].map((user) =>
        setDoc(
          doc(
            db,
            "ladders",
            MAESTRO_JOIN_DOUBLES_LADDER_ID,
            "ladderParticipants",
            user.userId,
          ),
          buildLadderParticipant(user),
        ),
      ),
    );
  }

  if (variant === JOIN_VARIANT.CLAIM_RACE) {
    await setDoc(
      doc(
        db,
        "ladders",
        MAESTRO_JOIN_DOUBLES_LADDER_ID,
        "ladderMembers",
        partnerA.userId,
      ),
      { userId: partnerA.userId, teamKey: GHOST_TEAM_KEY },
    );
  }

  await resetHomeCourtNotifications({
    testUser,
    ladderId: MAESTRO_JOIN_DOUBLES_LADDER_ID,
    ladderName: MAESTRO_JOIN_DOUBLES_LADDER_NAME,
  });
  return {
    ladderId: MAESTRO_JOIN_DOUBLES_LADDER_ID,
    variant,
    activeTeamKey: activeTeam.teamKey,
  };
};

export const cleanupLadderJoinTestData = async () => {
  await Promise.all(MAESTRO_JOIN_LADDER_IDS.map(resetLadderTree));
  await Promise.all(
    MAESTRO_JOIN_LADDER_IDS.map((id) => deleteDoc(doc(db, "ladders", id))),
  );
  await deleteAllMaestroFixtureTeams();
  await Promise.all(
    MAESTRO_JOIN_FIXTURE_USER_IDS.map((id) => deleteDoc(doc(db, "users", id))),
  );
  return { ladders: MAESTRO_JOIN_LADDER_IDS };
};
