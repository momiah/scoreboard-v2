import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  LADDER_PLAYOFF_TIES_COLLECTION,
  LADDER_STATUS,
  LADDER_TYPE,
  TEAM_STATUS,
  buildLadderParticipant,
  buildLadderPlayoffTies,
  createRootTeam,
  getLadderPlayoffQualifiers,
  LADDER_MIN_PLAYOFF_SIZE,
} from "@shared";
import { baselineProfileDetail, toPlayer } from "./seedRejectGameFlow";

export const MAESTRO_PO_LADDER_ID = "maestro-po-ladder";
export const MAESTRO_PO_DOUBLES_LADDER_ID = "maestro-po-doubles-ladder";
export const MAESTRO_PO_LADDER_IDS = [
  MAESTRO_PO_LADDER_ID,
  MAESTRO_PO_DOUBLES_LADDER_ID,
];
export const MAESTRO_PO_SINGLES_SIZE = 2048;
export const MAESTRO_PO_DOUBLES_TEAMS = 256;

const SINGLES_USER_PREFIX = "maestro-po-u";
const DOUBLES_USER_PREFIX = "maestro-pod-u";
const BATCH_LIMIT = 450;
const DAY_MS = 24 * 60 * 60 * 1000;

const CITIES = [
  { key: "london", name: "London", lat: 51.5074, lng: -0.1278 },
  { key: "croydon", name: "Croydon", lat: 51.3762, lng: -0.0982 },
  { key: "birmingham", name: "Birmingham", lat: 52.4862, lng: -1.8904 },
  { key: "coventry", name: "Coventry", lat: 52.4068, lng: -1.5197 },
  { key: "manchester", name: "Manchester", lat: 53.4808, lng: -2.2426 },
  { key: "salford", name: "Salford", lat: 53.4875, lng: -2.2901 },
  { key: "leeds", name: "Leeds", lat: 53.8008, lng: -1.5491 },
  { key: "bradford", name: "Bradford", lat: 53.796, lng: -1.7594 },
];

const courtId = (city) => `maestro-po-court-${city.key}`;
export const MAESTRO_PO_COURT_IDS = CITIES.map(courtId);

const toCourt = (city) => ({
  courtId: courtId(city),
  courtName: `Maestro Playoffs ${city.name}`,
  location: {
    address: "1 Test Street",
    city: city.name,
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "TE1 1ST",
    latitude: city.lat,
    longitude: city.lng,
  },
  verified: true,
  submittedBy: "",
  verifiedBy: null,
  verifiedAt: null,
  createdAt: new Date(),
});

const toHomeCourt = (court) => ({
  courtId: court.courtId,
  courtName: court.courtName,
  location: court.location,
});

const padded = (n) => String(n).padStart(4, "0");
const fixtureUserId = (prefix, n) => `${prefix}-${padded(n)}`;

const singlesFixtureUserIds = () =>
  Array.from({ length: MAESTRO_PO_SINGLES_SIZE - 1 }, (_, i) =>
    fixtureUserId(SINGLES_USER_PREFIX, i + 1),
  );

const doublesFixtureUserIds = () =>
  Array.from({ length: MAESTRO_PO_DOUBLES_TEAMS * 2 - 1 }, (_, i) =>
    fixtureUserId(DOUBLES_USER_PREFIX, i + 1),
  );

export const maestroPlayoffFixtureUserIds = () => [
  ...singlesFixtureUserIds(),
  ...doublesFixtureUserIds(),
];

const fixtureUser = (userId, n, xp) => ({
  userId,
  firstName: `P${padded(n)}`,
  lastName: "Seed",
  username: `po_${padded(n)}`,
  profileImage: "",
  profileDetail: baselineProfileDetail(xp),
});

const rankedStats = (rank, now) => ({
  competitionXP: 10000 - rank * 3,
  numberOfWins: Math.max(0, 40 - Math.floor(rank / 50)),
  totalPointDifference: 0,
  joinedAt: new Date(now.getTime() - 90 * DAY_MS + rank * 1000),
});

const commitInBatches = async (writes) => {
  for (let start = 0; start < writes.length; start += BATCH_LIMIT) {
    const batch = writeBatch(db);
    writes.slice(start, start + BATCH_LIMIT).forEach((write) => write(batch));
    await batch.commit();
  }
};

const deleteCollection = async (path) => {
  const snapshot = await getDocs(collection(db, ...path));
  await commitInBatches(
    snapshot.docs.map((docSnap) => (batch) => batch.delete(docSnap.ref)),
  );
};

const deleteLadder = async (ladderId) => {
  await Promise.all(
    [
      LADDER_PLAYOFF_TIES_COLLECTION,
      "ladderParticipants",
      "ladderTeams",
      "ladderMatches",
    ].map((sub) => deleteCollection(["ladders", ladderId, sub])),
  );
  await commitInBatches([(batch) => batch.delete(doc(db, "ladders", ladderId))]);
};

const buildLadderDoc = ({ ladderId, name, ladderType, size, testUser, now }) => ({
  ladderId,
  name,
  description:
    "Seeded by maestro/seeds/seedLadderPlayoffs.js for playoff testing. Safe to ignore.",
  image: "",
  region: "Test",
  countryCode: "GB",
  ladderType,
  genderType: "Mixed",
  courtIds: MAESTRO_PO_COURT_IDS,
  status: LADDER_STATUS.REGISTRATION_CLOSED,
  registrationOpensAt: new Date(now.getTime() - 120 * DAY_MS),
  registrationClosesAt: new Date(now.getTime() - 60 * DAY_MS),
  seasonStartsAt: new Date(now.getTime() - 90 * DAY_MS),
  seasonEndsAt: new Date(now.getTime() - 60 * 1000),
  playoffStartsAt: new Date(now.getTime() - 60 * 1000),
  playoffEndsAt: new Date(now.getTime() + 30 * DAY_MS),
  entryFee: 0,
  currencyType: "GBP",
  minRank: 0,
  maxPlayers: size,
  participantCount: size,
  prizesDistributed: false,
  createdBy: testUser.userId,
  createdAt: now,
  updatedBy: testUser.userId,
  updatedAt: now,
});

const toEntrant = ({ entrantKey, teamId, players, stats, homeCourt, xp }) => ({
  entrantKey,
  teamId,
  players,
  competitionXP: stats.competitionXP,
  numberOfWins: stats.numberOfWins,
  totalPointDifference: stats.totalPointDifference,
  globalXp: xp,
  joinedAt: stats.joinedAt,
  homeCourt,
});

/**
 * Writes the bracket the way processLadderPhases does, using the same shared
 * helpers, so UI tests don't have to wait for the scheduled function.
 */
const generateBracket = async ({ ladderId, entrants, maxPlayers, now }) => {
  const { bracketSize, qualifiers } = getLadderPlayoffQualifiers({
    entrants,
    registeredCount: Math.max(entrants.length, LADDER_MIN_PLAYOFF_SIZE),
    maxPlayers,
  });
  const ties = buildLadderPlayoffTies({ ladderId, qualifiers, createdAt: now });
  await commitInBatches([
    ...ties.map((tie) => (batch) =>
      batch.set(
        doc(db, "ladders", ladderId, LADDER_PLAYOFF_TIES_COLLECTION, tie.tieId),
        tie,
      ),
    ),
    (batch) =>
      batch.update(doc(db, "ladders", ladderId), {
        status: LADDER_STATUS.PLAYOFFS,
        playoffsGeneratedAt: now,
        playoffBracketSize: bracketSize,
        playoffEntrantCount: entrants.length,
      }),
  ]);
  return { bracketSize, tieCount: ties.length };
};

const seedCourts = (courts) =>
  courts.map((court) => (batch) =>
    batch.set(doc(db, "courts", court.courtId), court),
  );

/**
 * A 2048-player singles ladder past its playoff start. The test user is ranked
 * #1 and fixture n is ranked n + 1 (CP strictly decreasing), with home courts
 * cycling through 8 UK cities, so the top 128 are the test user and fixtures
 * 0001–0127. With `generate` the bracket is written now; otherwise the
 * deployed processLadderPhases creates it on its next run.
 */
export const seedLadderPlayoffs = async ({ testUser, generate = false }) => {
  if (!testUser?.userId) {
    throw new Error("seedLadderPlayoffs: testUser with a userId is required");
  }
  const now = new Date();
  const courts = CITIES.map(toCourt);
  const size = MAESTRO_PO_SINGLES_SIZE;

  await deleteLadder(MAESTRO_PO_LADDER_ID);

  const writes = [...seedCourts(courts)];
  writes.push((batch) =>
    batch.set(
      doc(db, "ladders", MAESTRO_PO_LADDER_ID),
      buildLadderDoc({
        ladderId: MAESTRO_PO_LADDER_ID,
        name: "Maestro Playoffs 2048",
        ladderType: LADDER_TYPE.SINGLES,
        size,
        testUser,
        now,
      }),
    ),
  );

  const entrants = [];
  for (let rank = 0; rank < size; rank += 1) {
    const isTestUser = rank === 0;
    const xp = 500;
    const user = isTestUser
      ? testUser
      : fixtureUser(fixtureUserId(SINGLES_USER_PREFIX, rank), rank, xp);
    const stats = rankedStats(rank, now);
    const homeCourt = toHomeCourt(courts[rank % courts.length]);

    if (!isTestUser) {
      writes.push((batch) => batch.set(doc(db, "users", user.userId), user));
    }
    writes.push((batch) =>
      batch.set(
        doc(db, "ladders", MAESTRO_PO_LADDER_ID, "ladderParticipants", user.userId),
        {
          ...buildLadderParticipant(user),
          ...stats,
          homeCourt,
          homeCourtChanges: 0,
        },
      ),
    );
    entrants.push(
      toEntrant({
        entrantKey: user.userId,
        teamId: null,
        players: [toPlayer(user)],
        stats,
        homeCourt,
        xp: isTestUser ? testUser.profileDetail?.XP ?? 0 : xp,
      }),
    );
  }

  await commitInBatches(writes);

  const bracket = generate
    ? await generateBracket({
        ladderId: MAESTRO_PO_LADDER_ID,
        entrants,
        maxPlayers: size,
        now,
      })
    : null;

  return {
    ladderId: MAESTRO_PO_LADDER_ID,
    entrants: size,
    expectedBracketSize: 128,
    generated: bracket,
  };
};

/**
 * A 256-team doubles ladder past its playoff start (top 16). The test user's
 * team (with fixture partner 0001) is ranked #1; team n is fixtures
 * 2n and 2n + 1.
 */
export const seedLadderPlayoffsDoubles = async ({
  testUser,
  generate = false,
}) => {
  if (!testUser?.userId) {
    throw new Error(
      "seedLadderPlayoffsDoubles: testUser with a userId is required",
    );
  }
  const now = new Date();
  const courts = CITIES.map(toCourt);
  const teamCount = MAESTRO_PO_DOUBLES_TEAMS;

  await deleteLadder(MAESTRO_PO_DOUBLES_LADDER_ID);

  const writes = [...seedCourts(courts)];
  writes.push((batch) =>
    batch.set(
      doc(db, "ladders", MAESTRO_PO_DOUBLES_LADDER_ID),
      buildLadderDoc({
        ladderId: MAESTRO_PO_DOUBLES_LADDER_ID,
        name: "Maestro Playoffs Doubles 256",
        ladderType: LADDER_TYPE.DOUBLES,
        size: teamCount,
        testUser,
        now,
      }),
    ),
  );

  const entrants = [];
  for (let rank = 0; rank < teamCount; rank += 1) {
    const xp = 500;
    const firstN = rank === 0 ? null : rank * 2;
    const secondN = rank === 0 ? 1 : rank * 2 + 1;
    const first =
      rank === 0
        ? testUser
        : fixtureUser(fixtureUserId(DOUBLES_USER_PREFIX, firstN), firstN, xp);
    const second = fixtureUser(
      fixtureUserId(DOUBLES_USER_PREFIX, secondN),
      secondN,
      xp,
    );
    [first, second]
      .filter((user) => user.userId !== testUser.userId)
      .forEach((user) =>
        writes.push((batch) => batch.set(doc(db, "users", user.userId), user)),
      );

    const players = [first, second].map((user) => ({
      ...toPlayer(user),
      profileImage: user.profileImage || "",
    }));
    const root = createRootTeam({
      players,
      createdBy: first.userId,
      teamId: `maestro-po-team-${padded(rank)}`,
      teamName: `Playoff Team ${padded(rank)}`,
    });
    const stats = rankedStats(rank, now);
    const homeCourt = toHomeCourt(courts[rank % courts.length]);
    writes.push((batch) =>
      batch.set(
        doc(db, "ladders", MAESTRO_PO_DOUBLES_LADDER_ID, "ladderTeams", root.teamKey),
        {
          ...root,
          XP: stats.competitionXP,
          numberOfWins: stats.numberOfWins,
          totalPointDifference: stats.totalPointDifference,
          joinedAt: stats.joinedAt,
          status: TEAM_STATUS.ACTIVE,
          homeCourt,
          homeCourtChanges: 0,
        },
      ),
    );
    entrants.push(
      toEntrant({
        entrantKey: root.teamKey,
        teamId: root.teamId ?? null,
        players: players.map(toPlayer),
        stats,
        homeCourt,
        xp: (rank === 0 ? testUser.profileDetail?.XP ?? 0 : xp) + xp,
      }),
    );
  }

  await commitInBatches(writes);

  const bracket = generate
    ? await generateBracket({
        ladderId: MAESTRO_PO_DOUBLES_LADDER_ID,
        entrants,
        maxPlayers: teamCount,
        now,
      })
    : null;

  return {
    ladderId: MAESTRO_PO_DOUBLES_LADDER_ID,
    entrants: teamCount,
    expectedBracketSize: 16,
    generated: bracket,
  };
};

export const cleanupLadderPlayoffsTestData = async () => {
  await Promise.all(MAESTRO_PO_LADDER_IDS.map(deleteLadder));
  await commitInBatches([
    ...maestroPlayoffFixtureUserIds().map((userId) => (batch) =>
      batch.delete(doc(db, "users", userId)),
    ),
    ...MAESTRO_PO_COURT_IDS.map((id) => (batch) =>
      batch.delete(doc(db, "courts", id)),
    ),
  ]);
  return {
    deletedLadders: MAESTRO_PO_LADDER_IDS,
    deletedUsers: maestroPlayoffFixtureUserIds().length,
    deletedCourts: MAESTRO_PO_COURT_IDS,
  };
};
