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
  LADDER_MATCH_STATUS,
  LADDER_STATUS,
  LADDER_TYPE,
  notificationSchema,
  notificationTypes,
  normalizeTeamKey,
} from "@shared";
import { buildSeedLadderTeam } from "./buildSeedLadderTeam";
import {
  HOME_COURT_VARIANT,
  homeCourtEntrantFields,
  postedMatchDocument,
  seedFixtureUser,
} from "./homeCourtFixtures";

export const MAESTRO_DISBAND_LADDER_ID = "maestro-disband-ladder";
export const MAESTRO_DISBAND_DONE_LADDER_ID = "maestro-disband-done-ladder";
export const MAESTRO_DISBAND_LADDER_IDS = [
  MAESTRO_DISBAND_LADDER_ID,
  MAESTRO_DISBAND_DONE_LADDER_ID,
];
export const MAESTRO_DISBAND_LADDER_NAME = "Maestro Disband Ladder";
export const MAESTRO_DISBAND_DONE_LADDER_NAME = "Maestro Disband Done Ladder";
export const MAESTRO_DISBAND_MATCH_ID = "maestro-disband-match";
export const MAESTRO_DISBAND_PARTNER_ID = "maestro-disband-partner";
export const MAESTRO_DISBAND_OPP1_ID = "maestro-disband-opp1";
export const MAESTRO_DISBAND_OPP2_ID = "maestro-disband-opp2";
export const MAESTRO_DISBAND_FIXTURE_USER_IDS = [
  MAESTRO_DISBAND_PARTNER_ID,
  MAESTRO_DISBAND_OPP1_ID,
  MAESTRO_DISBAND_OPP2_ID,
];

const FIXTURE_TAG = "disband";
const LADDER_SUBCOLLECTIONS = [
  "ladderMatches",
  "ladderParticipants",
  "ladderTeams",
  "ladderMembers",
];
const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days) => new Date(Date.now() + days * DAY_MS);

export const DISBAND_VARIANT = {
  OPEN: "open",
  POSTED_MATCH: "postedMatch",
  ACCEPTED_MATCH: "acceptedMatch",
  APPROVED_GAME: "approvedGame",
  ACCEPTED_REQUESTED_BY_USER: "acceptedRequestedByUser",
  ACCEPTED_REQUESTED_BY_OPPONENT: "acceptedRequestedByOpponent",
  ACCEPTED_REQUESTED_BY_PARTNER: "acceptedRequestedByPartner",
  ACCEPTED_GAME_REPORTED: "acceptedGameReported",
  REGISTRATION_CLOSED: "registrationClosed",
  PLAYOFFS: "playoffs",
  LADDER_COMPLETED: "ladderCompleted",
  OTHER_LADDER_COMPLETED: "otherLadderCompleted",
};

const partner = {
  userId: MAESTRO_DISBAND_PARTNER_ID,
  firstName: "Maestro",
  lastName: "DisbandPartner",
  username: "maestro_disband_partner",
};
const opp1 = {
  userId: MAESTRO_DISBAND_OPP1_ID,
  firstName: "Maestro",
  lastName: "DisbandOpp1",
  username: "maestro_disband_opp1",
};
const opp2 = {
  userId: MAESTRO_DISBAND_OPP2_ID,
  firstName: "Maestro",
  lastName: "DisbandOpp2",
  username: "maestro_disband_opp2",
};

const STATUS_BY_VARIANT = {
  [DISBAND_VARIANT.REGISTRATION_CLOSED]: LADDER_STATUS.REGISTRATION_CLOSED,
  [DISBAND_VARIANT.PLAYOFFS]: LADDER_STATUS.PLAYOFFS,
  [DISBAND_VARIANT.LADDER_COMPLETED]: LADDER_STATUS.COMPLETED,
};

const deleteAllDocs = async (colRef) => {
  const snap = await getDocs(colRef);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

const resetLadderTree = (ladderId) =>
  Promise.all(
    LADDER_SUBCOLLECTIONS.map((sub) =>
      deleteAllDocs(collection(db, "ladders", ladderId, sub)),
    ),
  );

const deleteFixtureTeams = async () => {
  const snap = await getDocs(
    query(collection(db, "teams"), where("maestroFixture", "==", FIXTURE_TAG)),
  );
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};

const ladderDocument = ({ testUser, ladderId, name, status }) => ({
  ladderId,
  name,
  description:
    "Seeded by maestro/seeds/seedTeamDisbandFlow for Maestro E2E tests. Safe to ignore.",
  image: "",
  region: "Test",
  countryCode: "GB",
  ladderType: LADDER_TYPE.DOUBLES,
  genderType: "Mixed",
  courtIds: [],
  status,
  registrationOpensAt: daysFromNow(-5),
  registrationClosesAt:
    status === LADDER_STATUS.REGISTRATION_OPEN
      ? daysFromNow(7)
      : daysFromNow(-1),
  seasonStartsAt: daysFromNow(-5),
  seasonEndsAt: daysFromNow(60),
  playoffStartsAt: daysFromNow(50),
  playoffEndsAt: daysFromNow(60),
  entryFee: 0,
  currencyType: "GBP",
  minRank: 0,
  maxPlayers: 2048,
  participantCount: 1,
  prizesDistributed: false,
  createdBy: testUser.userId,
  createdAt: new Date(),
  updatedBy: testUser.userId,
  updatedAt: new Date(),
});

const writeNotifications = async ({ testUser, ladderId, ladderName }) => {
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
  await Promise.all(
    ["Summary", "Matchmaking", "Schedule"].map((tab) =>
      setDoc(doc(notificationsRef, `maestro-disband-${ladderId}-${tab}`), {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: testUser.userId,
        senderId: "system",
        message: `Maestro: open ${ladderName} on ${tab}`,
        type: notificationTypes.INFORMATION.LADDER.TYPE,
        data: { ladderId, tab },
      }),
    ),
  );
};

const approvedGameMatch = ({ matchId, userIds, teamKey, teamId }) => {
  const match = postedMatchDocument({
    matchId,
    createdBy: userIds[0],
    participants: userIds,
    ladderType: LADDER_TYPE.DOUBLES,
    teams: [{ teamId, teamKey, playerIds: userIds }],
  });
  return {
    ...match,
    matchStatus: LADDER_MATCH_STATUS.COMPLETED,
    games: match.games.map((game, index) =>
      index === 0 ? { ...game, approvalStatus: "approved" } : game,
    ),
  };
};

export const seedTeamDisbandFlow = async ({
  testUser,
  variant = DISBAND_VARIANT.OPEN,
}) => {
  if (!testUser?.userId) {
    throw new Error("seedTeamDisbandFlow: testUser with a userId is required");
  }

  await Promise.all([
    seedFixtureUser(partner, "maestro-disband-partner@example.com"),
    seedFixtureUser(opp1, "maestro-disband-opp1@example.com"),
    seedFixtureUser(opp2, "maestro-disband-opp2@example.com"),
  ]);
  await Promise.all(MAESTRO_DISBAND_LADDER_IDS.map(resetLadderTree));
  await deleteFixtureTeams();
  await Promise.all(
    [partner, opp1, opp2].flatMap((fixture) =>
      MAESTRO_DISBAND_LADDER_IDS.map(async (ladderId) => {
        const snap = await getDocs(
          query(
            collection(db, "users", fixture.userId, "notifications"),
            where("data.ladderId", "==", ladderId),
          ),
        );
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }),
    ),
  );

  const otherLadderDone = variant === DISBAND_VARIANT.OTHER_LADDER_COMPLETED;
  const mainStatus =
    STATUS_BY_VARIANT[variant] ?? LADDER_STATUS.REGISTRATION_OPEN;
  const ladderIds = otherLadderDone
    ? MAESTRO_DISBAND_LADDER_IDS
    : [MAESTRO_DISBAND_LADDER_ID];

  const team = {
    ...buildSeedLadderTeam({
      players: [testUser, partner],
      createdBy: testUser,
      teamName: "Maestro Disband Aces",
    }),
    ladderIds,
    maestroFixture: FIXTURE_TAG,
  };
  const { teamKey, teamId } = team;
  const userIds = [testUser.userId, partner.userId];

  await setDoc(doc(db, "teams", teamId), team);

  const ladders = [
    {
      id: MAESTRO_DISBAND_LADDER_ID,
      name: MAESTRO_DISBAND_LADDER_NAME,
      status: mainStatus,
    },
    ...(otherLadderDone
      ? [
          {
            id: MAESTRO_DISBAND_DONE_LADDER_ID,
            name: MAESTRO_DISBAND_DONE_LADDER_NAME,
            status: LADDER_STATUS.COMPLETED,
          },
        ]
      : []),
  ];
  for (const ladder of ladders) {
    await setDoc(
      doc(db, "ladders", ladder.id),
      ladderDocument({
        testUser,
        ladderId: ladder.id,
        name: ladder.name,
        status: ladder.status,
      }),
    );
    await setDoc(doc(db, "ladders", ladder.id, "ladderTeams", teamKey), {
      ...team,
      ...homeCourtEntrantFields(HOME_COURT_VARIANT.SET),
    });
    await Promise.all(
      userIds.map((userId) =>
        setDoc(doc(db, "ladders", ladder.id, "ladderMembers", userId), {
          userId,
          teamKey,
        }),
      ),
    );
    await writeNotifications({
      testUser,
      ladderId: ladder.id,
      ladderName: ladder.name,
    });
  }

  const matchRef = (ladderId) =>
    doc(db, "ladders", ladderId, "ladderMatches", MAESTRO_DISBAND_MATCH_ID);
  const ownTeam = { teamId, teamKey, playerIds: userIds };

  if (variant === DISBAND_VARIANT.POSTED_MATCH) {
    await setDoc(
      matchRef(MAESTRO_DISBAND_LADDER_ID),
      postedMatchDocument({
        matchId: MAESTRO_DISBAND_MATCH_ID,
        createdBy: testUser.userId,
        participants: userIds,
        ladderType: LADDER_TYPE.DOUBLES,
        teams: [ownTeam],
      }),
    );
  }

  const acceptedVariants = [
    DISBAND_VARIANT.ACCEPTED_MATCH,
    DISBAND_VARIANT.ACCEPTED_REQUESTED_BY_USER,
    DISBAND_VARIANT.ACCEPTED_REQUESTED_BY_OPPONENT,
    DISBAND_VARIANT.ACCEPTED_REQUESTED_BY_PARTNER,
    DISBAND_VARIANT.ACCEPTED_GAME_REPORTED,
  ];
  if (acceptedVariants.includes(variant)) {
    const rivalKey = normalizeTeamKey([opp1.userId, opp2.userId]);
    const posted = postedMatchDocument({
      matchId: MAESTRO_DISBAND_MATCH_ID,
      createdBy: opp1.userId,
      participants: [opp1.userId, opp2.userId, ...userIds],
      ladderType: LADDER_TYPE.DOUBLES,
      teams: [
        {
          teamId: rivalKey,
          teamKey: rivalKey,
          playerIds: [opp1.userId, opp2.userId],
        },
        ownTeam,
      ],
    });
    const requestBy = (requestedBy) => ({
      cancellationRequest: { requestedBy, requestedAt: new Date() },
    });
    const reportedGames = posted.games.map((game, index) =>
      index === 0
        ? {
            ...game,
            reporter: opp1.userId,
            approvalStatus: "pending",
            result: {
              winner: {
                team: "Team 1",
                players: [opp1.userId, opp2.userId],
                score: 21,
              },
              loser: { team: "Team 2", players: userIds, score: 15 },
            },
          }
        : game,
    );
    await setDoc(matchRef(MAESTRO_DISBAND_LADDER_ID), {
      ...posted,
      matchStatus: LADDER_MATCH_STATUS.ACCEPTED,
      acceptedBy: testUser.userId,
      acceptedAt: new Date(),
      ...(variant === DISBAND_VARIANT.ACCEPTED_REQUESTED_BY_USER
        ? requestBy(testUser.userId)
        : {}),
      ...(variant === DISBAND_VARIANT.ACCEPTED_REQUESTED_BY_OPPONENT
        ? requestBy(opp1.userId)
        : {}),
      ...(variant === DISBAND_VARIANT.ACCEPTED_REQUESTED_BY_PARTNER
        ? requestBy(partner.userId)
        : {}),
      ...(variant === DISBAND_VARIANT.ACCEPTED_GAME_REPORTED
        ? { games: reportedGames }
        : {}),
    });
  }

  if (variant === DISBAND_VARIANT.APPROVED_GAME) {
    await setDoc(
      matchRef(MAESTRO_DISBAND_LADDER_ID),
      approvedGameMatch({
        matchId: MAESTRO_DISBAND_MATCH_ID,
        userIds,
        teamKey,
        teamId,
      }),
    );
  }

  if (otherLadderDone) {
    await setDoc(
      matchRef(MAESTRO_DISBAND_DONE_LADDER_ID),
      approvedGameMatch({
        matchId: MAESTRO_DISBAND_MATCH_ID,
        userIds,
        teamKey,
        teamId,
      }),
    );
  }

  return { ladderId: MAESTRO_DISBAND_LADDER_ID, variant, teamKey };
};

export const cleanupTeamDisbandTestData = async () => {
  await Promise.all(MAESTRO_DISBAND_LADDER_IDS.map(resetLadderTree));
  await Promise.all(
    MAESTRO_DISBAND_LADDER_IDS.map((id) => deleteDoc(doc(db, "ladders", id))),
  );
  await deleteFixtureTeams();
  await Promise.all(
    MAESTRO_DISBAND_FIXTURE_USER_IDS.map((id) =>
      deleteDoc(doc(db, "users", id)),
    ),
  );
  return { ladders: MAESTRO_DISBAND_LADDER_IDS };
};
