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
  notificationSchema,
  notificationTypes,
  profileDetailSchema,
  scoreboardProfileSchema,
  tournamentSchema,
  prizeTypes,
} from "@shared";
import {
  buildTournamentPrizeAllocations,
  calculatePlayerPerformance,
  calculateTournamentPrizePool,
  generateInitialTeamStats,
  getOrderedApprovedGames,
  getTournamentPrizeWinnerIds,
  recalculateParticipantsFromFixtures,
} from "@shared/helpers";
import { db } from "../../../services/firebase.config";
import {
  deleteFixtureUserSubcollections,
  deleteFixtureUsers,
  writeFixtureUser,
} from "../../fixtures/fixtureUsers";
import { formatNumber } from "../../../helpers/formatNumber";
import { formatDisplayName } from "../../../helpers/formatDisplayName";
import { updateChatSummaries } from "../../../helpers/chatSummaries";
import { getLeagueLocationDetails } from "../../../helpers/getLeagueLocationDetails";
import {
  generateRoundRobinFixtures,
  generateSinglesRoundRobinFixtures,
} from "../../../helpers/Tournament/roundRobin";

// Doubles team keys are "<uid>-<uid>" and prizes split them on "-", so
// fixture user ids must not contain a hyphen.
const FIRST_NAMES = ["Ava", "Ben", "Cleo", "Dev", "Eli", "Fay", "Gus"];

const fixturePool = (prefix, lastName, count) =>
  Array.from({ length: count }, (_, i) => ({
    userId: `maestrorr${prefix}${i + 1}`,
    firstName: FIRST_NAMES[i],
    lastName,
    username: `maestrorr${prefix}${i + 1}`,
  }));

export const RR_SINGLES_USERS = fixturePool("s", "Rrsingles", 3);
export const RR_DOUBLES_USERS = fixturePool("d", "Rrdoubles", 7);
export const RR_FIXTURE_USER_IDS = [...RR_SINGLES_USERS, ...RR_DOUBLES_USERS].map(
  (u) => u.userId,
);

const singles = (count) => RR_SINGLES_USERS.slice(0, count);
const doubles = (count) => RR_DOUBLES_USERS.slice(0, count);

// seed: "none" (the flow creates it in the UI), "participants" (players joined
// through invites, no fixtures) or "fixtures" (also generated, like the admin
// tapping Generate Fixtures).
export const RR_SCENARIOS = {
  singles: { name: "Maestro RR Singles", type: "Singles", users: singles(3), seed: "none" },
  doubles: { name: "Maestro RR Doubles", type: "Doubles", users: doubles(7), seed: "none" },
  bulkSingles: { name: "Maestro RR Bulk Singles", type: "Singles", users: singles(3), seed: "fixtures" },
  bulkDoubles: { name: "Maestro RR Bulk Doubles", type: "Doubles", users: doubles(7), seed: "fixtures" },
  replaySingles: { name: "Maestro RR Replay Singles", type: "Singles", users: singles(3), seed: "fixtures" },
  replayDoubles: { name: "Maestro RR Replay Doubles", type: "Doubles", users: doubles(7), seed: "fixtures" },
  fairSingles: { name: "Maestro RR Fair Singles", type: "Singles", users: singles(3), seed: "participants" },
  fairDoubles: { name: "Maestro RR Fair Doubles", type: "Doubles", users: doubles(7), seed: "participants" },
  oddDoubles: { name: "Maestro RR Odd Doubles", type: "Doubles", users: doubles(5), seed: "participants" },
  oddSingles: { name: "Maestro RR Odd Singles", type: "Singles", users: singles(2), seed: "participants" },
  teamsDoubles: { name: "Maestro RR Teams Doubles", type: "Doubles", users: doubles(7), seed: "participants", distinctXp: true },
  gatesSingles: { name: "Maestro RR Gates Singles", type: "Singles", users: singles(3), seed: "participants" },
  gatesDoubles: { name: "Maestro RR Gates Doubles", type: "Doubles", users: doubles(7), seed: "participants" },
  memberSingles: { name: "Maestro RR Member Singles", type: "Singles", users: singles(3), seed: "participants", ownedByFixture: true },
  memberDoubles: { name: "Maestro RR Member Doubles", type: "Doubles", users: doubles(7), seed: "participants", ownedByFixture: true },
  chatSingles: { name: "Maestro RR Chat Singles", type: "Singles", users: singles(3), seed: "participants" },
};

export const RR_TOURNAMENT_PREFIX = "Maestro RR";
const ACTIVE_KEY = "maestro:rr:active";
const snapshotKey = (userId) => `maestro:rr:snapshot:${userId}`;
const seededId = (key) => `maestro-rr-${key.toLowerCase()}`;
const RR_COURTS = 2;

// Finishing order the scores follow: earlier wins. A doubles team plays as its
// strongest player. The test user (and, in doubles, their partner f1) sits
// second, behind f2, so they win some and lose one.
const strengthOrder = (scenario, testUserId) => {
  const ids = scenario.users.map((u) => u.userId);
  return [ids[1], testUserId, ids[0], ...ids.slice(2)];
};

const sideIds = (team) =>
  [team?.player1?.userId, team?.player2?.userId].filter(Boolean);

const sideStrength = (team, order) =>
  Math.min(...sideIds(team).map((id) => order.indexOf(id)));

// 21 to a loser score that differs per game, so standings never tie on PD.
export const scoreFor = (game, order) => {
  const team1Wins = sideStrength(game.team1, order) < sideStrength(game.team2, order);
  const loserScore = Math.min(9 + game.gameNumber, 19);
  return team1Wins ? [21, loserScore] : [loserScore, 21];
};

export const setActiveScenario = (key) => AsyncStorage.setItem(ACTIVE_KEY, key);

export const getActiveScenario = async () => {
  const key = await AsyncStorage.getItem(ACTIVE_KEY);
  if (!key || !RR_SCENARIOS[key]) throw new Error("No round-robin scenario seeded");
  return { key, scenario: RR_SCENARIOS[key] };
};

const allGames = (tournament) =>
  [...(tournament.fixtures ?? [])]
    .sort((a, b) => a.round - b.round)
    .flatMap((round) =>
      [...round.games]
        .sort((a, b) => a.gameNumber - b.gameNumber)
        .map((game) => ({ ...game, round: round.round })),
    );

const isApproved = (game) => game.approvalStatus === "approved";
const isPending = (game) =>
  game.approvalStatus === "Pending" || game.approvalStatus === "pending";

// ── Finding and removing a scenario's tournaments ───────────────────────────

const tournamentsNamed = async (name) => {
  const snap = await getDocs(
    query(collection(db, COLLECTION_NAMES.tournaments), where("tournamentName", "==", name)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

const isFixtureOwned = (tournament, testUser) =>
  tournament.tournamentOwner?.userId === testUser.userId ||
  RR_FIXTURE_USER_IDS.includes(tournament.tournamentOwner?.userId);

export const findScenarioTournament = async (scenario, testUser) => {
  const found = (await tournamentsNamed(scenario.name)).filter((t) =>
    isFixtureOwned(t, testUser),
  );
  if (found.length !== 1) {
    throw new Error(`Expected one "${scenario.name}", found ${found.length}`);
  }
  return found[0];
};

const deleteNotificationsFor = async (userIds, tournamentIds) => {
  await Promise.all(
    userIds.map(async (userId) => {
      const snap = await getDocs(collection(db, "users", userId, "notifications"));
      await Promise.all(
        snap.docs
          .filter((d) => tournamentIds.includes(d.data().data?.tournamentId))
          .map((d) => deleteDoc(d.ref)),
      );
    }),
  );
};

const deleteTournaments = async (tournaments, testUser) => {
  const ids = tournaments.map((t) => t.id);
  await deleteNotificationsFor([testUser.userId], ids);
  await Promise.all(ids.map((id) => deleteDoc(doc(db, "users", testUser.userId, "chats", id))));
  await Promise.all(
    tournaments.map(async (t) => {
      const chat = await getDocs(collection(db, COLLECTION_NAMES.tournaments, t.id, "chat"));
      await Promise.all(chat.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, COLLECTION_NAMES.tournaments, t.id));
    }),
  );
  return ids;
};

const scenarioTournaments = async (testUser) => {
  const lists = await Promise.all(
    Object.values(RR_SCENARIOS).map((s) => tournamentsNamed(s.name)),
  );
  return lists.flat().filter((t) => isFixtureOwned(t, testUser));
};

// ── The test user's profile: snapshot before the first seed, restored after ─

const restoreOrSnapshotTestUser = async (testUser) => {
  const ref = doc(db, "users", testUser.userId);
  const stored = await AsyncStorage.getItem(snapshotKey(testUser.userId));
  if (stored) {
    await updateDoc(ref, { profileDetail: JSON.parse(stored) });
    return JSON.parse(stored);
  }
  const snap = await getDoc(ref);
  const profileDetail = snap.data()?.profileDetail;
  if (!profileDetail) throw new Error("Test user has no profileDetail");
  await AsyncStorage.setItem(snapshotKey(testUser.userId), JSON.stringify(profileDetail));
  return profileDetail;
};

export const baseProfileFor = async (userId, testUser, scenario) => {
  if (userId !== testUser.userId) {
    const index = scenario.users.findIndex((u) => u.userId === userId);
    return { ...profileDetailSchema, XP: fixtureXp(scenario, index) };
  }
  const stored = await AsyncStorage.getItem(snapshotKey(testUser.userId));
  if (!stored) throw new Error("No test user snapshot: seed a scenario first");
  return JSON.parse(stored);
};

// ── Seeding ─────────────────────────────────────────────────────────────────

// distinctXp spreads the fixture users' XP (a played-in profile, as Balanced
// team generation needs) so XP order, and so the Balanced pairs, are fixed.
const fixtureXp = (scenario, index) =>
  scenario.distinctXp ? profileDetailSchema.XP * (index + 2) : profileDetailSchema.XP;

const writeScenarioUsers = async (scenario) => {
  const ids = scenario.users.map((u) => u.userId);
  await deleteFixtureUserSubcollections(ids);
  await Promise.all(
    scenario.users.map((u, i) =>
      writeFixtureUser({ ...u, profileDetail: { ...profileDetailSchema, XP: fixtureXp(scenario, i) } }),
    ),
  );
};

const ownerProfiles = (owner) => ({
  tournamentAdmins: [{ userId: owner.userId, username: owner.username }],
  tournamentParticipants: [
    {
      ...scoreboardProfileSchema,
      username: owner.username,
      firstName: owner.firstName,
      lastName: owner.lastName,
      userId: owner.userId,
      memberSince: owner.profileDetail?.memberSince || "",
      profileImage: owner.profileImage || "",
    },
  ],
  tournamentOwner: {
    userId: owner.userId,
    username: owner.username,
    firstName: owner.firstName,
    lastName: owner.lastName,
    location: owner.location,
  },
});

// The court every scenario plays at, the one a flow picks in Select Court.
const scenarioCourt = async (actions) => {
  const courts = await actions.getCourts();
  const court = [...courts].sort((a, b) =>
    a.courtName.trim().localeCompare(b.courtName.trim()),
  )[0];
  if (!court) throw new Error("No courts to play at");
  return { courts, court };
};

// Mirrors AddTournamentModal's onSubmit, with the scenario's fixed id.
const createScenarioTournament = async ({ key, scenario, owner, actions, clubId }) => {
  const { courts, court } = await scenarioCourt(actions);
  const location = getLeagueLocationDetails(courts, { key: court.courtId });
  const tournamentId = seededId(key);
  await actions.addCompetition({
    data: {
      ...tournamentSchema,
      tournamentName: scenario.name,
      tournamentDescription: "",
      startDate: moment().format("DD-MM-YYYY"),
      maxPlayers: 8,
      tournamentType: scenario.type,
      tournamentMode: "Round Robin",
      privacy: "Private",
      createdAt: new Date(),
      ...ownerProfiles(owner),
      tournamentImage: null,
      prizeType: prizeTypes.COMMUNITY,
      location,
      countryCode: location.countryCode || "",
      tournamentId,
      clubId,
    },
    competitionType: COMPETITION_TYPES.TOURNAMENT,
    resetDelayMs: 0,
  });
  const created = await getDoc(doc(db, COLLECTION_NAMES.tournaments, tournamentId));
  if (!created.exists()) throw new Error(`addCompetition did not write ${tournamentId}`);
  return tournamentId;
};

// The owner invites each player from InvitePlayer and they accept.
const invitePlayers = async ({ tournamentId, tournamentName, owner, players, actions, fixtureActions }) => {
  for (const player of players) {
    await actions.sendNotification({
      ...notificationSchema,
      createdAt: new Date(),
      recipientId: player.userId,
      senderId: owner.userId,
      message: `You've been invited to join ${tournamentName}`,
      type: notificationTypes.ACTION.INVITE.TOURNAMENT,
      data: { tournamentId },
    });
    await actions.updatePendingInvites(tournamentId, player.userId, COLLECTION_NAMES.tournaments);
    await fixtureActions.acceptInvite({
      userId: player.userId,
      competitionId: tournamentId,
      collectionName: COLLECTION_NAMES.tournaments,
    });
  }
  const joined = (await getDoc(doc(db, COLLECTION_NAMES.tournaments, tournamentId)))
    .data()
    .tournamentParticipants.map((p) => p.userId);
  const missing = players.filter((p) => !joined.includes(p.userId));
  if (missing.length) throw new Error(`Not joined: ${missing.map((p) => p.userId).join(", ")}`);
};

// The Fixed Doubles teams the flows pick: the test user with the first fixture
// user, then the rest in pairs.
export const fixedTeamsFor = (scenario, testUserId) => {
  const ids = [testUserId, ...scenario.users.map((u) => u.userId)];
  return Array.from({ length: Math.floor(ids.length / 2) }, (_, i) => [ids[2 * i], ids[2 * i + 1]]);
};

const generateScenarioFixtures = async ({ tournamentId, scenario, testUser, owner, actions }) => {
  const participants = await actions.extractPlayersWithXp(
    await actions.fetchTournamentParticipants(tournamentId),
    actions.getUserById,
  );
  const byId = new Map(participants.map((p) => [p.userId, p]));
  const result =
    scenario.type === "Singles"
      ? generateSinglesRoundRobinFixtures({ players: participants, numberOfCourts: RR_COURTS, competitionId: tournamentId })
      : generateRoundRobinFixtures({
          teams: fixedTeamsFor(scenario, testUser.userId).map(([a, b]) => ({
            player1: byId.get(a),
            player2: byId.get(b),
          })),
          numberOfCourts: RR_COURTS,
          competitionId: tournamentId,
        });
  if (!result) throw new Error("Fixture generation returned nothing");
  await actions.addTournamentFixtures({
    tournamentId,
    fixtures: result.fixtures,
    initialTeams: scenario.type === "Doubles" ? generateInitialTeamStats(result.fixtures) : [],
    numberOfCourts: RR_COURTS,
    currentUser: owner,
    mode: scenario.type === "Doubles" ? "Fixed Doubles" : "",
    generationType: "",
  });
};

// clubId puts the tournament in that club, as creating it from the club's
// screen does; the club's own cleanup removes the feed events it causes.
/** @param {{ key: string, testUser: any, actions: any, fixtureActions: any, clubId?: string | null }} args */
export const seedScenario = async ({ key, testUser, actions, fixtureActions, clubId = null }) => {
  const scenario = RR_SCENARIOS[key];
  await deleteTournaments(
    (await tournamentsNamed(scenario.name)).filter((t) => isFixtureOwned(t, testUser)),
    testUser,
  );
  await restoreOrSnapshotTestUser(testUser);
  await writeScenarioUsers(scenario);
  await setActiveScenario(key);

  if (scenario.seed !== "none") {
    const owner = scenario.ownedByFixture
      ? await actions.getUserById(scenario.users[0].userId)
      : testUser;
    const players = scenario.ownedByFixture
      ? [testUser, ...scenario.users.slice(1)]
      : scenario.users;
    const tournamentId = await createScenarioTournament({ key, scenario, owner, actions, clubId });
    await invitePlayers({
      tournamentId,
      tournamentName: scenario.name,
      owner,
      players,
      actions,
      fixtureActions,
    });
    if (scenario.seed === "fixtures") {
      await generateScenarioFixtures({ tournamentId, scenario, testUser, owner, actions });
    }
  }

  const nameOf = new Map(
    [testUser, ...scenario.users].map((u) => [u.userId, formatDisplayName(u)]),
  );
  return {
    expected: {
      tournamentName: scenario.name,
      courtName: (await scenarioCourt(actions)).court.courtName.trim(),
      ids: JSON.stringify({
        user: testUser.userId,
        ...Object.fromEntries(scenario.users.map((u, i) => [`f${i + 1}`, u.userId])),
      }),
      teams: JSON.stringify(
        fixedTeamsFor(scenario, testUser.userId).map((team) => team.map((id) => nameOf.get(id))),
      ),
    },
  };
};

// ── Fixture users playing ───────────────────────────────────────────────────

const waitForGame = async (tournamentId, gameId, predicate) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const snap = await getDoc(doc(db, COLLECTION_NAMES.tournaments, tournamentId));
    const game = allGames(snap.data()).find((g) => g.gameId === gameId);
    if (game && predicate(game)) return game;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Game ${gameId} never reached the expected state`);
};

const approveAs = async ({ fixtureActions, tournament, game, approverId }) => {
  await fixtureActions.approveTournamentGame({
    userId: approverId,
    game,
    tournamentId: tournament.tournamentId,
  });
  await waitForGame(tournament.tournamentId, game.gameId, isApproved);
};

const reportAs = async ({ fixtureActions, tournament, game, reporterId, order }) => {
  const [score1, score2] = scoreFor(game, order);
  await fixtureActions.reportGame({ reporterId, game, score1, score2, tournament });
  return waitForGame(tournament.tournamentId, game.gameId, isPending);
};

const opponentOf = (game, userId) => {
  const onTeam1 = sideIds(game.team1).includes(userId);
  return sideIds(onTeam1 ? game.team2 : game.team1)[0];
};

const loadActive = async (testUser) => {
  const { key, scenario } = await getActiveScenario();
  const tournament = await findScenarioTournament(scenario, testUser);
  return { key, scenario, tournament, order: strengthOrder(scenario, testUser.userId) };
};

// Every game in the round that the test user isn't in: one side reports, the
// other approves, in game order.
export const playFixtureGames = async ({ round, testUser, fixtureActions }) => {
  const { tournament, order } = await loadActive(testUser);
  const games = allGames(tournament).filter(
    (g) => g.round === round && !isApproved(g) && !sideIds(g.team1).concat(sideIds(g.team2)).includes(testUser.userId),
  );
  for (const game of games) {
    const reporterId = sideIds(game.team1)[0];
    const reported = await reportAs({ fixtureActions, tournament, game, reporterId, order });
    await approveAs({ fixtureActions, tournament, game: reported, approverId: sideIds(game.team2)[0] });
  }
  return { played: games.map((g) => g.gameNumber) };
};

export const approveUserReports = async ({ testUser, fixtureActions }) => {
  const { tournament } = await loadActive(testUser);
  const games = allGames(tournament).filter((g) => isPending(g) && g.reporter === testUser.userId);
  if (games.length === 0) throw new Error("No pending games reported by the test user");
  for (const game of games) {
    await approveAs({ fixtureActions, tournament, game, approverId: opponentOf(game, testUser.userId) });
  }
  return { approved: games.map((g) => g.gameNumber) };
};

export const opponentReportsUserGame = async ({ round, testUser, fixtureActions }) => {
  const { tournament, order } = await loadActive(testUser);
  const game = allGames(tournament).find(
    (g) => g.round === round && !isApproved(g) && sideIds(g.team1).concat(sideIds(g.team2)).includes(testUser.userId),
  );
  if (!game) throw new Error(`Test user has no open game in round ${round}`);
  await reportAs({ fixtureActions, tournament, game, reporterId: opponentOf(game, testUser.userId), order });
  return { reported: game.gameNumber };
};

// Fixture users report and approve the given games, in the order given.
export const playGamesInOrder = async ({ gameNumbers, testUser, fixtureActions }) => {
  const { tournament, order } = await loadActive(testUser);
  for (const gameNumber of gameNumbers) {
    const game = allGames(tournament).find((g) => g.gameNumber === gameNumber);
    const players = sideIds(game.team1).concat(sideIds(game.team2));
    const reporterId = players.find((id) => id !== testUser.userId && sideIds(game.team1).includes(id)) ?? sideIds(game.team2).find((id) => id !== testUser.userId);
    const reported = await reportAs({ fixtureActions, tournament, game, reporterId, order });
    await approveAs({ fixtureActions, tournament, game: reported, approverId: opponentOf(game, reporterId) });
  }
  return { played: gameNumbers };
};

// Plays every open game in fixture order (fixture users report and approve,
// acting for the test user too) until the tournament completes. Returns the
// expected prize winners by placement: [{ userId, xp, place, key }].
export const playToCompletion = async ({ testUser, fixtureActions }) => {
  const { tournament } = await loadActive(testUser);
  const open = allGames(tournament).filter((g) => !isApproved(g)).map((g) => g.gameNumber);
  await playGamesInOrder({ gameNumbers: open, testUser, fixtureActions });
  const state = JSON.parse((await expectedState({ testUser })).expected.state);
  if (!state.complete) throw new Error("Tournament did not complete");
  return {
    winners: Object.entries(state.prizes)
      .map(([userId, prize]) => ({ userId, ...prize }))
      .sort((a, b) => parseInt(a.place, 10) - parseInt(b.place, 10)),
  };
};

// The report notification goes to every opponent and to nobody on the
// reporter's side.
export const checkReportNotifications = async ({ testUser }) => {
  const { tournament } = await loadActive(testUser);
  const games = allGames(tournament).filter((g) => isPending(g) || isApproved(g));
  const failures = [];
  for (const game of games) {
    const reporterSide = sideIds(game.team1).includes(game.reporter) ? game.team1 : game.team2;
    const opponentSide = reporterSide === game.team1 ? game.team2 : game.team1;
    for (const userId of [...sideIds(reporterSide), ...sideIds(opponentSide)]) {
      const snap = await getDocs(
        query(
          collection(db, "users", userId, "notifications"),
          where("type", "==", notificationTypes.ACTION.ADD_GAME.TOURNAMENT),
        ),
      );
      const count = snap.docs.filter((d) => d.data().data?.gameId === game.gameId).length;
      const wanted = sideIds(opponentSide).includes(userId) ? 1 : 0;
      if (count !== wanted) failures.push(`game ${game.gameNumber}: ${userId} has ${count}, wants ${wanted}`);
    }
  }
  if (failures.length) throw new Error(failures.join("; "));
  return { checked: games.length };
};

// ── Fixture fairness ────────────────────────────────────────────────────────

const sideKey = (team) => sideIds(team).sort().join("-");

const permutationsOf = (items) =>
  items.length <= 1
    ? [items]
    : items.flatMap((item, i) =>
        permutationsOf([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
      );

// The most even court spread any court ordering per round can give these
// pairings; null when there are too many orderings to try.
const bestCourtSpread = (fixtures, sides, courtNumbers, spread) => {
  const perRound = fixtures.map((round) => permutationsOf(courtNumbers).map((perm) => perm.slice(0, round.games.length)));
  const combinations = perRound.reduce((n, options) => n * options.length, 1);
  if (combinations > 50000) return null;
  let best = Infinity;
  const walk = (roundIdx, counts) => {
    if (roundIdx === fixtures.length) {
      best = Math.min(best, spread(counts));
      return;
    }
    for (const perm of perRound[roundIdx]) {
      const next = new Map([...counts].map(([s, perCourt]) => [s, new Map(perCourt)]));
      fixtures[roundIdx].games.forEach((g, i) => {
        for (const s of [sideKey(g.team1), sideKey(g.team2)]) {
          next.get(s).set(perm[i], (next.get(s).get(perm[i]) ?? 0) + 1);
        }
      });
      walk(roundIdx + 1, next);
    }
  };
  walk(0, new Map(sides.map((s) => [s, new Map()])));
  return best;
};

export const courtSpread = (fixtures) => {
  const games = fixtures.flatMap((round) => round.games);
  const sides = [...new Set(games.flatMap((g) => [sideKey(g.team1), sideKey(g.team2)]))];
  const courtNumbers = [...new Set(games.map((g) => g.court))].sort();
  const spread = (perSide) =>
    [...perSide.values()].reduce((total, perCourt) => {
      const counts = courtNumbers.map((c) => perCourt.get(c) ?? 0);
      return total + Math.max(...counts) - Math.min(...counts);
    }, 0);
  const generatedCounts = new Map(sides.map((s) => [s, new Map()]));
  games.forEach((g) => {
    for (const s of [sideKey(g.team1), sideKey(g.team2)]) {
      generatedCounts.get(s).set(g.court, (generatedCounts.get(s).get(g.court) ?? 0) + 1);
    }
  });
  return {
    generated: spread(generatedCounts),
    best: bestCourtSpread(fixtures, sides, courtNumbers, spread),
  };
};

export const checkFixtureFairness = async ({ testUser }) => {
  const { tournament } = await loadActive(testUser);
  const games = allGames(tournament);
  const sides = [...new Set(games.flatMap((g) => [sideKey(g.team1), sideKey(g.team2)]))];
  const pairs = new Map();
  const sitOuts = new Map(sides.map((s) => [s, 0]));
  const failures = [];

  for (const g of games) {
    const pair = [sideKey(g.team1), sideKey(g.team2)].sort().join(" v ");
    pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
  }
  for (const round of tournament.fixtures) {
    const playing = new Set(round.games.flatMap((g) => [sideKey(g.team1), sideKey(g.team2)]));
    sides.forEach((s) => !playing.has(s) && sitOuts.set(s, sitOuts.get(s) + 1));
    if (playing.size !== round.games.length * 2) failures.push(`round ${round.round} has a side playing twice`);
  }

  const wantedPairs = (sides.length * (sides.length - 1)) / 2;
  if (pairs.size !== wantedPairs) failures.push(`${pairs.size} pairings, wants ${wantedPairs}`);
  pairs.forEach((n, pair) => n !== 1 && failures.push(`${pair} plays ${n} times`));
  if (games.length !== tournament.numberOfGames) failures.push(`numberOfGames ${tournament.numberOfGames}, fixtures hold ${games.length}`);

  const sitOutCounts = [...sitOuts.values()];
  if (Math.max(...sitOutCounts) - Math.min(...sitOutCounts) > 1) failures.push(`sit-outs uneven: ${sitOutCounts.join(",")}`);

  // Courts can't always split evenly (four entrants over three rounds on two
  // courts force someone onto one court three times), so the check is that no
  // court assignment of these same pairings spreads them more evenly.
  const { generated, best } = courtSpread(tournament.fixtures);
  if (best !== null && generated > best) {
    failures.push(`court spread ${generated}, an assignment of the same pairings gives ${best}`);
  }

  if (failures.length) throw new Error(failures.join("; "));
  return {
    expected: {
      rounds: String(tournament.fixtures.length),
      games: String(games.length),
      sides: String(sides.length),
      sitOutsPerSide: String(Math.max(...sitOutCounts)),
    },
  };
};

// The teams the fixtures were generated with: Random covers every player
// once, Balanced pairs the highest XP with the lowest, Fixed is the pairs
// fixedTeamsFor lists.
export const checkTeams = async ({ testUser, generation }) => {
  const { scenario, tournament } = await loadActive(testUser);
  const teams = (tournament.tournamentTeams ?? []).map((t) => t.teamKey.split("-").sort().join("-")).sort();
  const playerIds = tournament.tournamentParticipants.map((p) => p.userId);
  const failures = [];

  if (teams.length !== Math.floor(playerIds.length / 2)) failures.push(`${teams.length} teams for ${playerIds.length} players`);
  const inTeams = teams.flatMap((t) => t.split("-")).sort();
  if (inTeams.join() !== [...playerIds].sort().join()) failures.push("teams don't cover every player once");

  const pairsKey = (pairs) => pairs.map((p) => [...p].sort().join("-")).sort().join();
  if (generation === "Balanced") {
    const xpById = new Map();
    for (const id of playerIds) {
      xpById.set(id, (await getDoc(doc(db, "users", id))).data()?.profileDetail?.XP ?? 0);
    }
    const byXp = [...playerIds].sort((a, b) => xpById.get(b) - xpById.get(a));
    const half = byXp.length / 2;
    const wanted = byXp.slice(0, half).map((id, i) => [id, byXp[byXp.length - 1 - i]]);
    if (pairsKey(wanted) !== teams.join()) failures.push(`Balanced teams ${teams.join()} want ${pairsKey(wanted)}`);
  }
  if (generation === "Fixed" && pairsKey(fixedTeamsFor(scenario, testUser.userId)) !== teams.join()) {
    failures.push(`Fixed teams ${teams.join()} aren't the chosen pairs`);
  }
  if (failures.length) throw new Error(failures.join("; "));
  return { generationMode: tournament.generationMode, generationType: tournament.generationType, teams };
};

// After games approved in reverse fixture order, the stored standings are the
// fixture-order replay: results logs and streaks included, which a fold in
// approval order would get wrong.
export const checkReplay = async ({ testUser }) => {
  const { scenario, tournament } = await loadActive(testUser);
  const isDoubles = scenario.type === "Doubles";
  const ordered = getOrderedApprovedGames(tournament.fixtures);
  const replay = async (games) =>
    recalculateParticipantsFromFixtures(
      games,
      clone(tournament.tournamentParticipants),
      clone(tournament.tournamentTeams ?? []),
      isDoubles,
    );
  const fixtureOrder = await replay(ordered);
  const approvalOrder = await replay([...ordered].reverse());
  const shape = (entrants, key) =>
    JSON.stringify(
      [...entrants]
        .sort((a, b) => String(a[key]).localeCompare(String(b[key])))
        .map((e) => [e[key], e.numberOfWins, e.totalPointDifference, e.resultLog, e.currentStreak, e.highestWinStreak]),
    );
  const failures = [];
  if (shape(tournament.tournamentParticipants, "userId") !== shape(fixtureOrder.updatedParticipants, "userId")) {
    failures.push("stored players are not the fixture-order replay");
  }
  if (isDoubles && shape(tournament.tournamentTeams, "teamKey") !== shape(fixtureOrder.updatedTeams, "teamKey")) {
    failures.push("stored teams are not the fixture-order replay");
  }
  if (shape(fixtureOrder.updatedParticipants, "userId") === shape(approvalOrder.updatedParticipants, "userId")) {
    failures.push("approval order gives the same standings, so this run proves nothing");
  }
  if (failures.length) throw new Error(failures.join("; "));
  return { games: ordered.length };
};

// ── Expected numbers ────────────────────────────────────────────────────────

const pdText = (pd) => `${pd > 0 ? "+" : ""}${formatNumber(pd)} PD`;
const cpText = (xp) => `${formatNumber(Number(xp.toFixed(0)))} CP`;
const ordinal = (n) => `${n}${["st", "nd", "rd"][((((n + 90) % 100) - 10) % 10) - 1] ?? "th"}`;

const clone = (value) => JSON.parse(JSON.stringify(value));

// Profiles after each approved game in fixture order, from the profiles they
// had before the tournament, the way approveGame applies them one by one.
const expectedProfiles = async (tournament, testUser, scenario, ordered, isDoubles) => {
  const ids = [...new Set(tournament.tournamentParticipants.map((p) => p.userId))];
  const users = new Map();
  for (const userId of ids) {
    users.set(userId, { userId, profileDetail: clone(await baseProfileFor(userId, testUser, scenario)) });
  }
  for (let k = 0; k < ordered.length; k++) {
    const game = ordered[k];
    const { updatedParticipants } = await recalculateParticipantsFromFixtures(
      ordered.slice(0, k),
      clone(tournament.tournamentParticipants),
      clone(tournament.tournamentTeams ?? []),
      isDoubles,
    );
    const playerIds = sideIds(game.team1).concat(sideIds(game.team2));
    calculatePlayerPerformance(
      clone(game),
      updatedParticipants.filter((p) => playerIds.includes(p.userId)),
      playerIds.map((id) => users.get(id)),
    );
  }
  return users;
};

export const expectedState = async ({ testUser }) => {
  const { scenario, tournament, order } = await loadActive(testUser);
  const isDoubles = scenario.type === "Doubles";
  const ordered = getOrderedApprovedGames(tournament.fixtures);

  const { updatedParticipants, updatedTeams } = await recalculateParticipantsFromFixtures(
    ordered,
    clone(tournament.tournamentParticipants),
    clone(tournament.tournamentTeams ?? []),
    isDoubles,
  );
  const users = await expectedProfiles(tournament, testUser, scenario, ordered, isDoubles);

  const complete = tournament.numberOfGames > 0 && ordered.length >= tournament.numberOfGames;
  const prizes = {};
  if (complete) {
    const pool = calculateTournamentPrizePool(tournament.numberOfGames, scenario.type);
    const winners = getTournamentPrizeWinnerIds({
      ...tournament,
      tournamentParticipants: updatedParticipants,
      tournamentTeams: updatedTeams,
    });
    buildTournamentPrizeAllocations(winners, pool, isDoubles).forEach((a) => {
      const user = users.get(a.userId);
      user.profileDetail.XP += a.prizeXP;
      user.profileDetail.tournamentStats[a.placementKey] += 1;
      prizes[a.userId] = { xp: String(a.prizeXP), place: ordinal(a.placementIndex + 1), key: a.placementKey };
    });
  }

  // PlayerPerformance orders by wins, PD, then global XP; TeamPerformance by
  // wins, PD, then average PD.
  const players = [...updatedParticipants].sort(
    (a, b) =>
      b.numberOfWins - a.numberOfWins ||
      b.totalPointDifference - a.totalPointDifference ||
      users.get(b.userId).profileDetail.XP - users.get(a.userId).profileDetail.XP,
  );
  const teams = [...updatedTeams].sort(
    (a, b) =>
      b.numberOfWins - a.numberOfWins ||
      b.totalPointDifference - a.totalPointDifference ||
      b.averagePointDifference - a.averagePointDifference,
  );

  const standings = Object.fromEntries([
    ...players.map((p, i) => [p.userId, { wins: String(p.numberOfWins), pd: String(p.totalPointDifference), rank: ordinal(i + 1) }]),
    ...teams.map((t, i) => [t.teamKey, { wins: String(t.numberOfWins), pd: String(t.totalPointDifference), rank: ordinal(i + 1) }]),
  ]);
  const profiles = Object.fromEntries(
    [...users.values()].map(({ userId, profileDetail: p }) => [
      userId,
      {
        cp: cpText(p.XP),
        pd: pdText(p.totalPointDifference || 0),
        wins: formatNumber(p.numberOfWins || 0),
        losses: formatNumber(p.numberOfLosses || 0),
        first: String(p.tournamentStats?.first ?? 0),
        second: String(p.tournamentStats?.second ?? 0),
        third: String(p.tournamentStats?.third ?? 0),
        fourth: String(p.tournamentStats?.fourth ?? 0),
      },
    ]),
  );

  const games = allGames(tournament);
  const userTeamKey = teams.find((t) => t.teamKey.split("-").includes(testUser.userId))?.teamKey ?? "";
  const userGames = Object.fromEntries(
    games
      .filter((g) => sideIds(g.team1).concat(sideIds(g.team2)).includes(testUser.userId))
      .map((g) => [g.round, { gameNumber: String(g.gameNumber), score: scoreFor(g, order).join("-") }]),
  );

  return {
    expected: {
      state: JSON.stringify({
        complete,
        rounds: tournament.fixtures.length,
        numberOfGames: games.length,
        approved: ordered.length,
        userTeamKey,
        standings,
        profiles,
        prizes,
        userGames,
        scores: Object.fromEntries(games.map((g) => [g.gameNumber, scoreFor(g, order).join("-")])),
        displayScores: Object.fromEntries(
          games.map((g) => {
            const [a, b] = scoreFor(g, order);
            return [g.gameNumber, `${a} - ${b}`];
          }),
        ),
      }),
    },
  };
};

// The prize function has run: every winner has the prize notification, and
// prizesDistributed is set.
export const checkPrizeNotifications = async ({ testUser }) => {
  const { tournament } = await loadActive(testUser);
  const fresh = (await getDoc(doc(db, COLLECTION_NAMES.tournaments, tournament.tournamentId))).data();
  if (!fresh.prizesDistributed) throw new Error("prizesDistributed is still false");
  const state = JSON.parse((await expectedState({ testUser })).expected.state);
  const failures = [];
  for (const [userId, prize] of Object.entries(state.prizes)) {
    const snap = await getDocs(collection(db, "users", userId, "notifications"));
    const found = snap.docs.some(
      (d) =>
        d.data().data?.tournamentId === tournament.tournamentId &&
        d.data().senderId === "system" &&
        String(d.data().message).includes(`won ${prize.xp} CP`),
    );
    if (!found) failures.push(`${userId} has no prize notification for ${prize.xp} CP`);
  }
  if (failures.length) throw new Error(failures.join("; "));
  return { winners: Object.keys(state.prizes).length };
};

// ── Cleanup ─────────────────────────────────────────────────────────────────

// An opponent sends a message from the tournament's Chat Room, as ChatRoom's
// handleSend does: the message, then every other entrant's chat summary.
export const opponentSendsChatMessage = async ({ testUser, actions }) => {
  const { scenario } = await getActiveScenario();
  const tournament = await findScenarioTournament(scenario, testUser);
  const sender = scenario.users[0];
  const text = `Good luck, ${formatDisplayName(testUser)}!`;
  await actions.sendChatMessage({
    message: {
      text,
      createdAt: new Date(),
      user: { _id: sender.userId, name: sender.username, avatar: "" },
    },
    competitionId: tournament.id,
    competitionType: COMPETITION_TYPES.TOURNAMENT,
  });
  const lastMessage = `${sender.username}: ${text}`;
  await updateChatSummaries({
    recipientIds: (tournament.tournamentParticipants ?? [])
      .map((p) => p.userId)
      .filter((id) => id !== sender.userId),
    competitionId: tournament.id,
    competitionName: tournament.tournamentName,
    competitionType: COMPETITION_TYPES.TOURNAMENT,
    lastMessage,
  });
  return {
    expected: { tournamentId: tournament.id, tournamentName: tournament.tournamentName, lastMessage, text },
  };
};

export const cleanupRoundRobinTestData = async ({ testUser }) => {
  const tournaments = await scenarioTournaments(testUser);
  const deleted = await deleteTournaments(tournaments, testUser);
  const stored = await AsyncStorage.getItem(snapshotKey(testUser.userId));
  if (stored) {
    await updateDoc(doc(db, "users", testUser.userId), { profileDetail: JSON.parse(stored) });
    await AsyncStorage.removeItem(snapshotKey(testUser.userId));
  } else if (deleted.length > 0) {
    throw new Error("Round-robin tournaments existed but no test user snapshot to restore");
  }
  await AsyncStorage.removeItem(ACTIVE_KEY);
  await deleteFixtureUsers(RR_FIXTURE_USER_IDS);
  return { tournaments: deleted, restoredTestUser: !!stored };
};

