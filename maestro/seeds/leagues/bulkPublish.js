import AsyncStorage from "@react-native-async-storage/async-storage";
import moment from "moment";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  COLLECTION_NAMES,
  COMPETITION_TYPES,
  leagueSchema,
  notificationSchema,
  notificationTypes,
  prizeTypes,
  profileDetailSchema,
  scoreboardProfileSchema,
} from "@shared";
import { applyLeagueGameResults } from "@shared/helpers";
import { db } from "../../../services/firebase.config";
import {
  deleteFixtureUserSubcollections,
  deleteFixtureUsers,
  writeFixtureUser,
} from "../../fixtures/fixtureUsers";
import { formatNumber } from "../../../helpers/formatNumber";
import { calculateEndDate } from "../../../helpers/calculateEndDate";
import { getLeagueLocationDetails } from "../../../helpers/getLeagueLocationDetails";

// Doubles team keys are "<uid>-<uid>", so fixture user ids have no hyphen.
const FIRST_NAMES = ["Ava", "Ben", "Cleo"];
const fixturePool = (prefix, lastName) =>
  FIRST_NAMES.map((firstName, i) => ({
    userId: `maestrolg${prefix}${i + 1}`,
    firstName,
    lastName,
    username: `maestrolg${prefix}${i + 1}`,
  }));

const SINGLES_USERS = fixturePool("s", "Lgsingles");
const DOUBLES_USERS = fixturePool("d", "Lgdoubles");
export const LEAGUE_FIXTURE_USER_IDS = [...SINGLES_USERS, ...DOUBLES_USERS].map(
  (u) => u.userId,
);

// Players are "user" (the signed-in test user) or "f1".."f3" (fixture users).
// The admin enters these games one by one in Bulk Publish; the last game is
// the one the Android number pad used to cover.
export const LEAGUE_SCENARIOS = {
  bulkSingles: {
    name: "Maestro League Bulk Singles",
    type: "Singles",
    users: SINGLES_USERS,
    games: [
      { team1: ["user"], team2: ["f1"], score: [21, 15] },
      { team1: ["f1"], team2: ["f2"], score: [21, 19] },
      { team1: ["f2"], team2: ["f3"], score: [23, 21] },
      { team1: ["user"], team2: ["f3"], score: [21, 10] },
    ],
  },
  bulkDoubles: {
    name: "Maestro League Bulk Doubles",
    type: "Doubles",
    users: DOUBLES_USERS,
    games: [
      { team1: ["user", "f1"], team2: ["f2", "f3"], score: [21, 15] },
      { team1: ["user", "f2"], team2: ["f1", "f3"], score: [21, 18] },
      { team1: ["user", "f3"], team2: ["f1", "f2"], score: [19, 21] },
    ],
  },
};

const ACTIVE_KEY = "maestro:league:active";
const snapshotKey = (userId) => `maestro:league:snapshot:${userId}`;
const seededId = (key) => `maestro-league-${key.toLowerCase()}`;

const clone = (value) => JSON.parse(JSON.stringify(value));
const ordinal = (n) =>
  `${n}${["st", "nd", "rd"][((((n + 90) % 100) - 10) % 10) - 1] ?? "th"}`;
const pdText = (pd) => `${pd > 0 ? "+" : ""}${formatNumber(pd)} PD`;
const cpText = (xp) => `${formatNumber(Number(xp.toFixed(0)))} CP`;

const scenarioIds = (scenario, testUser) => ({
  user: testUser.userId,
  ...Object.fromEntries(scenario.users.map((u, i) => [`f${i + 1}`, u.userId])),
});

// ── Finding and removing scenario leagues ───────────────────────────────────

const leaguesNamed = async (name) => {
  const snap = await getDocs(
    query(
      collection(db, COLLECTION_NAMES.leagues),
      where("leagueName", "==", name),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

const scenarioLeagues = async (testUser) => {
  const lists = await Promise.all(
    Object.values(LEAGUE_SCENARIOS).map((s) => leaguesNamed(s.name)),
  );
  return lists.flat().filter((l) => l.leagueOwner?.userId === testUser.userId);
};

const deleteLeagues = async (leagues, testUser) => {
  const ids = leagues.map((l) => l.id);
  if (ids.length > 30) throw new Error("More than 30 scenario leagues");
  if (ids.length > 0) {
    const notifications = await getDocs(
      query(
        collection(db, "users", testUser.userId, "notifications"),
        where("data.leagueId", "in", ids),
      ),
    );
    await Promise.all(notifications.docs.map((d) => deleteDoc(d.ref)));
  }
  await Promise.all(
    leagues.map(async (l) => {
      await deleteDoc(doc(db, "users", testUser.userId, "chats", l.id));
      const chat = await getDocs(
        collection(db, COLLECTION_NAMES.leagues, l.id, "chat"),
      );
      await Promise.all(chat.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, COLLECTION_NAMES.leagues, l.id));
    }),
  );
  return ids;
};

// ── The test user's profile: snapshot before the first seed, restored after ─

const restoreOrSnapshotTestUser = async (testUser) => {
  const ref = doc(db, "users", testUser.userId);
  const stored = await AsyncStorage.getItem(snapshotKey(testUser.userId));
  if (stored) {
    await updateDoc(ref, { profileDetail: JSON.parse(stored) });
    return JSON.parse(stored);
  }
  const profileDetail = (await getDoc(ref)).data()?.profileDetail;
  if (!profileDetail) throw new Error("Test user has no profileDetail");
  await AsyncStorage.setItem(
    snapshotKey(testUser.userId),
    JSON.stringify(profileDetail),
  );
  return profileDetail;
};

// ── Seeding ─────────────────────────────────────────────────────────────────

const participantFor = (user) => ({
  ...scoreboardProfileSchema,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  userId: user.userId,
  memberSince: user.profileDetail?.memberSince || "",
  profileImage: user.profileImage || "",
});

// Mirrors AddLeagueModal's onSubmit (Private, so real users never see it),
// with the scenario's fixed id, starting today for one month.
const createScenarioLeague = async ({ key, scenario, owner, actions }) => {
  const courts = await actions.getCourts();
  const court = [...courts].sort((a, b) =>
    a.courtName.trim().localeCompare(b.courtName.trim()),
  )[0];
  if (!court) throw new Error("No courts to play at");
  const location = getLeagueLocationDetails(courts, { key: court.courtId });
  const leagueId = seededId(key);
  const startDate = moment().format("DD-MM-YYYY");
  await actions.addCompetition({
    data: {
      ...leagueSchema,
      leagueName: scenario.name,
      leagueDescription: "",
      startDate,
      leagueLengthInMonths: "1",
      endDate: calculateEndDate(startDate, "1"),
      maxPlayers: 8,
      leagueType: scenario.type,
      privacy: "Private",
      createdAt: new Date(),
      leagueAdmins: [{ userId: owner.userId, username: owner.username }],
      leagueParticipants: [participantFor(owner)],
      leagueOwner: {
        userId: owner.userId,
        username: owner.username,
        firstName: owner.firstName,
        lastName: owner.lastName,
        location: owner.location,
      },
      leagueImage: null,
      prizeType: prizeTypes.COMMUNITY,
      location,
      countryCode: location.countryCode || "",
      leagueId,
      clubId: null,
    },
    competitionType: COMPETITION_TYPES.LEAGUE,
    resetDelayMs: 0,
  });
  const created = await getDoc(doc(db, COLLECTION_NAMES.leagues, leagueId));
  if (!created.exists())
    throw new Error(`addCompetition did not write ${leagueId}`);
  return leagueId;
};

// The owner invites each player from InvitePlayer and they accept.
const invitePlayers = async ({
  leagueId,
  scenario,
  owner,
  actions,
  fixtureActions,
}) => {
  for (const player of scenario.users) {
    await actions.updatePendingInvites(
      leagueId,
      player.userId,
      COLLECTION_NAMES.leagues,
    );
    await actions.sendNotification({
      ...notificationSchema,
      createdAt: new Date(),
      recipientId: player.userId,
      senderId: owner.userId,
      message: `You've been invited to join ${scenario.name}`,
      type: notificationTypes.ACTION.INVITE.LEAGUE,
      data: { leagueId },
    });
    await fixtureActions.acceptInvite({
      userId: player.userId,
      competitionId: leagueId,
      collectionName: COLLECTION_NAMES.leagues,
    });
  }
  const joined = (await getDoc(doc(db, COLLECTION_NAMES.leagues, leagueId)))
    .data()
    .leagueParticipants.map((p) => p.userId);
  const missing = scenario.users.filter((u) => !joined.includes(u.userId));
  if (missing.length) {
    throw new Error(`Not joined: ${missing.map((u) => u.userId).join(", ")}`);
  }
};

export const seedLeagueScenario = async ({
  key,
  testUser,
  actions,
  fixtureActions,
}) => {
  const scenario = LEAGUE_SCENARIOS[key];
  if (!scenario) throw new Error(`No league scenario ${key}`);
  await restoreOrSnapshotTestUser(testUser);
  await deleteLeagues(await scenarioLeagues(testUser), testUser);
  const ids = scenario.users.map((u) => u.userId);
  await deleteFixtureUserSubcollections(ids);
  await Promise.all(
    scenario.users.map((u) =>
      writeFixtureUser({ ...u, profileDetail: profileDetailSchema }),
    ),
  );
  const owner = (await getDoc(doc(db, "users", testUser.userId))).data();
  const leagueId = await createScenarioLeague({
    key,
    scenario,
    owner,
    actions,
  });
  await invitePlayers({ leagueId, scenario, owner, actions, fixtureActions });
  await AsyncStorage.setItem(ACTIVE_KEY, key);

  const idOf = scenarioIds(scenario, testUser);
  return {
    expected: {
      leagueName: scenario.name,
      ids: JSON.stringify(idOf),
      games: JSON.stringify(
        scenario.games.map((g) => ({
          team1: g.team1.map((p) => idOf[p]),
          team2: g.team2.map((p) => idOf[p]),
          score: `${g.score[0]}${g.score[1]}`,
        })),
      ),
    },
  };
};

// ── Expected numbers after every scenario game is published ─────────────────

const loadActive = async (testUser) => {
  const key = await AsyncStorage.getItem(ACTIVE_KEY);
  const scenario = LEAGUE_SCENARIOS[key];
  if (!scenario) throw new Error("No active league scenario: seed one first");
  const snap = await getDoc(doc(db, COLLECTION_NAMES.leagues, seededId(key)));
  if (!snap.exists()) throw new Error(`League ${seededId(key)} is missing`);
  return {
    key,
    scenario,
    league: snap.data(),
    idOf: scenarioIds(scenario, testUser),
  };
};

const plannedGames = (scenario, idOf, participants) => {
  const byId = Object.fromEntries(participants.map((p) => [p.userId, p]));
  const player = (alias) => {
    const p = byId[idOf[alias]];
    return {
      userId: p.userId,
      username: p.username,
      firstName: p.firstName,
      lastName: p.lastName,
      displayName: p.username,
    };
  };
  return scenario.games.map((g, i) => {
    const [s1, s2] = g.score;
    const team1Wins = s1 > s2;
    return {
      gameId: `planned-${i}`,
      date: moment().format("DD-MM-YYYY"),
      approvalStatus: "approved",
      team1: {
        player1: player(g.team1[0]),
        player2: g.team1[1] ? player(g.team1[1]) : null,
        score: s1,
      },
      team2: {
        player1: player(g.team2[0]),
        player2: g.team2[1] ? player(g.team2[1]) : null,
        score: s2,
      },
      result: {
        winner: {
          team: team1Wins ? "Team 1" : "Team 2",
          score: Math.max(s1, s2),
          players: [],
        },
        loser: {
          team: team1Wins ? "Team 2" : "Team 1",
          score: Math.min(s1, s2),
          players: [],
        },
      },
    };
  });
};

// The league and profiles the app's own scoring gives for the scenario games,
// from the profiles everyone had before the league.
const expectedResults = async ({ scenario, league, idOf, testUser }) => {
  const stored = await AsyncStorage.getItem(snapshotKey(testUser.userId));
  if (!stored) throw new Error("No test user snapshot: seed a scenario first");
  const users = Object.values(idOf).map((userId) => ({
    userId,
    profileDetail:
      userId === testUser.userId
        ? JSON.parse(stored)
        : clone(profileDetailSchema),
  }));
  const participants = league.leagueParticipants.map((p) => ({
    ...clone(scoreboardProfileSchema),
    username: p.username,
    firstName: p.firstName,
    lastName: p.lastName,
    userId: p.userId,
    memberSince: p.memberSince,
    profileImage: p.profileImage,
  }));
  return applyLeagueGameResults({
    games: plannedGames(scenario, idOf, participants),
    participants,
    teams: [],
    users,
    isDoubles: scenario.type === "Doubles",
  });
};

export const expectedLeagueState = async ({ testUser }) => {
  const { scenario, league, idOf } = await loadActive(testUser);
  const results = await expectedResults({ scenario, league, idOf, testUser });
  const xpOf = Object.fromEntries(
    results.users.map((u) => [u.userId, u.profileDetail.XP]),
  );

  // PlayerPerformance orders by wins, PD, then global XP; TeamPerformance by
  // wins, PD, then average PD.
  const players = [...results.participants].sort(
    (a, b) =>
      b.numberOfWins - a.numberOfWins ||
      b.totalPointDifference - a.totalPointDifference ||
      (xpOf[b.userId] ?? 0) - (xpOf[a.userId] ?? 0),
  );
  const teams = [...results.teams].sort(
    (a, b) =>
      b.numberOfWins - a.numberOfWins ||
      b.totalPointDifference - a.totalPointDifference ||
      b.averagePointDifference - a.averagePointDifference,
  );
  const row = (e, i) => ({
    wins: String(e.numberOfWins),
    pd: String(e.totalPointDifference),
    rank: ordinal(i + 1),
  });
  const userProfile = results.users.find(
    (u) => u.userId === testUser.userId,
  ).profileDetail;

  return {
    expected: {
      state: JSON.stringify({
        published: (league.games || []).length,
        numberOfGames: scenario.games.length,
        players: Object.fromEntries(
          players.map((p, i) => [p.userId, row(p, i)]),
        ),
        teams: Object.fromEntries(teams.map((t, i) => [t.teamKey, row(t, i)])),
        userProfile: {
          cp: cpText(userProfile.XP),
          pd: pdText(userProfile.totalPointDifference || 0),
          wins: formatNumber(userProfile.numberOfWins || 0),
          losses: formatNumber(userProfile.numberOfLosses || 0),
        },
      }),
    },
  };
};

// The stored league and profiles match the app's scoring exactly; a mismatch
// lists every difference.
export const checkLeagueResults = async ({ testUser }) => {
  const { scenario, league, idOf } = await loadActive(testUser);
  const results = await expectedResults({ scenario, league, idOf, testUser });
  const failures = [];
  const compare = (label, stored, expected, fields) =>
    fields.forEach((f) => {
      if (JSON.stringify(stored?.[f]) !== JSON.stringify(expected?.[f])) {
        failures.push(
          `${label}.${f}: ${JSON.stringify(stored?.[f])} != ${JSON.stringify(expected?.[f])}`,
        );
      }
    });
  const statFields = [
    "numberOfWins",
    "numberOfLosses",
    "numberOfGamesPlayed",
    "totalPointDifference",
    "resultLog",
  ];

  if ((league.games || []).length !== scenario.games.length) {
    failures.push(
      `games: ${(league.games || []).length} != ${scenario.games.length}`,
    );
  }
  results.participants.forEach((p) =>
    compare(
      `participant ${p.userId}`,
      league.leagueParticipants.find((s) => s.userId === p.userId),
      p,
      [...statFields, "XP"],
    ),
  );
  if (scenario.type === "Doubles") {
    if ((league.leagueTeams || []).length !== results.teams.length) {
      failures.push(
        `teams: ${(league.leagueTeams || []).length} != ${results.teams.length}`,
      );
    }
    results.teams.forEach((t) =>
      compare(
        `team ${t.teamKey}`,
        (league.leagueTeams || []).find((s) => s.teamKey === t.teamKey),
        t,
        statFields,
      ),
    );
  } else if ((league.leagueTeams || []).length > 0) {
    failures.push(`singles league has ${league.leagueTeams.length} teams`);
  }
  for (const u of results.users) {
    const stored = (await getDoc(doc(db, "users", u.userId))).data()
      ?.profileDetail;
    compare(`profile ${u.userId}`, stored, u.profileDetail, [
      "XP",
      "numberOfWins",
      "numberOfLosses",
      "totalPointDifference",
    ]);
  }
  if (failures.length) throw new Error(failures.join("\n"));
  return { expected: { checked: String(results.users.length) } };
};

export const cleanupLeagueTestData = async ({ testUser }) => {
  const deleted = await deleteLeagues(
    await scenarioLeagues(testUser),
    testUser,
  );
  const stored = await AsyncStorage.getItem(snapshotKey(testUser.userId));
  if (stored) {
    await updateDoc(doc(db, "users", testUser.userId), {
      profileDetail: JSON.parse(stored),
    });
    await AsyncStorage.removeItem(snapshotKey(testUser.userId));
  } else if (deleted.length > 0) {
    throw new Error(
      "League scenarios existed but no test user snapshot to restore",
    );
  }
  await AsyncStorage.removeItem(ACTIVE_KEY);
  await deleteFixtureUsers(LEAGUE_FIXTURE_USER_IDS);
  return { leagues: deleted, restoredTestUser: !!stored };
};
