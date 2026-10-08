import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  LADDER_CANCELLED_REASON,
  LADDER_PLAYOFF_TIES_COLLECTION,
  LADDER_STATUS,
  LADDER_TYPE,
  TEAM_STATUS,
  buildLadderParticipant,
  buildLadderPlayoffTies,
  createRootTeam,
  getLadderPlayoffBracketSize,
  getLadderPlayoffQualifiers,
  LADDER_MIN_PLAYOFF_SIZE,
  notificationSchema,
  notificationTypes,
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
export const MAESTRO_PO_CANCELLED_SIZE = LADDER_MIN_PLAYOFF_SIZE - 1;

export const PLAYOFF_VARIANT = {
  STANDARD: "standard",
  NOT_QUALIFIED: "notQualified",
  UPCOMING: "upcoming",
  CANCELLED: "cancelled",
};

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
  await commitInBatches([
    (batch) => batch.delete(doc(db, "ladders", ladderId)),
  ]);
};

const buildLadderDoc = ({
  ladderId,
  name,
  ladderType,
  size,
  testUser,
  now,
  variant = PLAYOFF_VARIANT.STANDARD,
}) => {
  const upcoming = variant === PLAYOFF_VARIANT.UPCOMING;
  const cancelled = variant === PLAYOFF_VARIANT.CANCELLED;
  return {
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
    status: cancelled
      ? LADDER_STATUS.CANCELLED
      : LADDER_STATUS.REGISTRATION_CLOSED,
    ...(cancelled
      ? {
          cancelledAt: now,
          cancelledReason: LADDER_CANCELLED_REASON.TOO_FEW_REGISTRATIONS,
        }
      : {}),
    registrationOpensAt: new Date(now.getTime() - 120 * DAY_MS),
    registrationClosesAt: new Date(now.getTime() - 60 * DAY_MS),
    seasonStartsAt: new Date(now.getTime() - 90 * DAY_MS),
    seasonEndsAt: upcoming
      ? new Date(now.getTime() + 3 * DAY_MS)
      : new Date(now.getTime() - 60 * 1000),
    playoffStartsAt: upcoming
      ? new Date(now.getTime() + 3 * DAY_MS)
      : new Date(now.getTime() - 60 * 1000),
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
  };
};

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
    ...ties.map(
      (tie) => (batch) =>
        batch.set(
          doc(
            db,
            "ladders",
            ladderId,
            LADDER_PLAYOFF_TIES_COLLECTION,
            tie.tieId,
          ),
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

const NOTIFICATION_TABS = ["Summary", "Playoffs"];

const writePlayoffNotifications = async ({
  testUser,
  ladderId,
  ladderName,
  promoted = false,
  cancelled = false,
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
  await commitInBatches(
    stale.docs.map((docSnap) => (batch) => batch.delete(docSnap.ref)),
  );

  const base = {
    ...notificationSchema,
    createdAt: new Date(),
    recipientId: testUser.userId,
    type: notificationTypes.INFORMATION.LADDER.TYPE,
  };
  const entries = NOTIFICATION_TABS.map((tab) => ({
    id: `maestro-po-entry-${ladderId}-${tab}`,
    data: {
      ...base,
      senderId: "system",
      message: `Maestro: open ${ladderName} on ${tab}`,
      data: { ladderId, tab },
    },
  }));
  const phase = [];
  if (promoted) {
    phase.push({
      id: `maestro-po-promotion-${ladderId}`,
      data: {
        ...base,
        senderId: "system",
        title: "You made the playoffs!",
        message: `Congratulations! You've made the playoffs in ${ladderName}. You have 10 days to play both your home and away games.`,
        data: { ladderId, tab: "Playoffs" },
      },
    });
  }
  if (cancelled) {
    phase.push({
      id: `maestro-po-cancelled-${ladderId}`,
      data: {
        ...base,
        senderId: "system",
        title: "Ladder cancelled",
        message: `${ladderName} has been cancelled because not enough players signed up before registration closed. If you paid an entry fee, it will be refunded to you in full.`,
        data: { ladderId, tab: "Summary" },
      },
    });
  }
  await commitInBatches(
    [...entries, ...phase].map(
      ({ id, data }) =>
        (batch) =>
          batch.set(doc(notificationsRef, id), data),
    ),
  );
};

const seedCourts = (courts) =>
  courts.map(
    (court) => (batch) => batch.set(doc(db, "courts", court.courtId), court),
  );

const expectedBracketSize = (size) =>
  getLadderPlayoffBracketSize({
    registeredCount: Math.max(size, LADDER_MIN_PLAYOFF_SIZE),
    maxPlayers: size,
    entrantCount: size,
  });

export const seedLadderPlayoffs = async ({
  testUser,
  generate = false,
  size = MAESTRO_PO_SINGLES_SIZE,
  variant = PLAYOFF_VARIANT.STANDARD,
}) => {
  if (!testUser?.userId) {
    throw new Error("seedLadderPlayoffs: testUser with a userId is required");
  }
  if (size < 2 || size > MAESTRO_PO_SINGLES_SIZE) {
    throw new Error(
      `seedLadderPlayoffs: size must be between 2 and ${MAESTRO_PO_SINGLES_SIZE}`,
    );
  }
  const now = new Date();
  const courts = CITIES.map(toCourt);
  const bracketSize = expectedBracketSize(size);
  const testUserRank =
    variant === PLAYOFF_VARIANT.NOT_QUALIFIED ? bracketSize : 0;
  const cancelled = variant === PLAYOFF_VARIANT.CANCELLED;
  const upcoming = variant === PLAYOFF_VARIANT.UPCOMING;
  const ladderName = `Maestro Playoffs ${size}`;

  await deleteLadder(MAESTRO_PO_LADDER_ID);

  const writes = [...seedCourts(courts)];
  writes.push((batch) =>
    batch.set(
      doc(db, "ladders", MAESTRO_PO_LADDER_ID),
      buildLadderDoc({
        ladderId: MAESTRO_PO_LADDER_ID,
        name: ladderName,
        ladderType: LADDER_TYPE.SINGLES,
        size,
        testUser,
        now,
        variant,
      }),
    ),
  );

  const entrants = [];
  for (let rank = 0; rank < size; rank += 1) {
    const isTestUser = rank === testUserRank;
    const fixtureNumber = rank < testUserRank ? rank + 1 : rank;
    const xp = 500;
    const user = isTestUser
      ? testUser
      : fixtureUser(
          fixtureUserId(SINGLES_USER_PREFIX, fixtureNumber),
          fixtureNumber,
          xp,
        );
    const stats = rankedStats(rank, now);
    const homeCourt = toHomeCourt(courts[rank % courts.length]);

    if (!isTestUser) {
      writes.push((batch) => batch.set(doc(db, "users", user.userId), user));
    }
    writes.push((batch) =>
      batch.set(
        doc(
          db,
          "ladders",
          MAESTRO_PO_LADDER_ID,
          "ladderParticipants",
          user.userId,
        ),
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
        xp: isTestUser ? (testUser.profileDetail?.XP ?? 0) : xp,
      }),
    );
  }

  await commitInBatches(writes);

  const shouldGenerate = generate && !cancelled && !upcoming;
  const bracket = shouldGenerate
    ? await generateBracket({
        ladderId: MAESTRO_PO_LADDER_ID,
        entrants,
        maxPlayers: size,
        now,
      })
    : null;

  await writePlayoffNotifications({
    testUser,
    ladderId: MAESTRO_PO_LADDER_ID,
    ladderName,
    promoted: shouldGenerate && testUserRank < bracketSize,
    cancelled,
  });

  return {
    ladderId: MAESTRO_PO_LADDER_ID,
    ladderName,
    entrants: size,
    expectedBracketSize: cancelled ? 0 : bracketSize,
    generated: bracket,
  };
};

export const seedLadderPlayoffsDoubles = async ({
  testUser,
  generate = false,
  teams: teamCount = MAESTRO_PO_DOUBLES_TEAMS,
}) => {
  if (!testUser?.userId) {
    throw new Error(
      "seedLadderPlayoffsDoubles: testUser with a userId is required",
    );
  }
  if (teamCount < 2 || teamCount > MAESTRO_PO_DOUBLES_TEAMS) {
    throw new Error(
      `seedLadderPlayoffsDoubles: teams must be between 2 and ${MAESTRO_PO_DOUBLES_TEAMS}`,
    );
  }
  const now = new Date();
  const courts = CITIES.map(toCourt);
  const bracketSize = expectedBracketSize(teamCount);
  const ladderName = `Maestro Playoffs Doubles ${teamCount}`;

  await deleteLadder(MAESTRO_PO_DOUBLES_LADDER_ID);

  const writes = [...seedCourts(courts)];
  writes.push((batch) =>
    batch.set(
      doc(db, "ladders", MAESTRO_PO_DOUBLES_LADDER_ID),
      buildLadderDoc({
        ladderId: MAESTRO_PO_DOUBLES_LADDER_ID,
        name: ladderName,
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
        doc(
          db,
          "ladders",
          MAESTRO_PO_DOUBLES_LADDER_ID,
          "ladderTeams",
          root.teamKey,
        ),
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
        xp: (rank === 0 ? (testUser.profileDetail?.XP ?? 0) : xp) + xp,
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

  await writePlayoffNotifications({
    testUser,
    ladderId: MAESTRO_PO_DOUBLES_LADDER_ID,
    ladderName,
    promoted: generate,
  });

  return {
    ladderId: MAESTRO_PO_DOUBLES_LADDER_ID,
    ladderName,
    entrants: teamCount,
    expectedBracketSize: bracketSize,
    generated: bracket,
  };
};

export const cleanupLadderPlayoffsTestData = async () => {
  await Promise.all(MAESTRO_PO_LADDER_IDS.map(deleteLadder));
  await commitInBatches([
    ...maestroPlayoffFixtureUserIds().map(
      (userId) => (batch) => batch.delete(doc(db, "users", userId)),
    ),
    ...MAESTRO_PO_COURT_IDS.map(
      (id) => (batch) => batch.delete(doc(db, "courts", id)),
    ),
  ]);
  return {
    deletedLadders: MAESTRO_PO_LADDER_IDS,
    deletedUsers: maestroPlayoffFixtureUserIds().length,
    deletedCourts: MAESTRO_PO_COURT_IDS,
  };
};
