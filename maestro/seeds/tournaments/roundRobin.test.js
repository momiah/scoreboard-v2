jest.mock("../../../services/firebase.config", () => ({ db: {} }));
jest.mock("firebase/firestore", () => require("../../../helpers/testing/fakeFirestore").firestoreMock);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { profileDetailSchema, scoreboardProfileSchema } from "@shared";
import { getOrderedApprovedGames } from "@shared/helpers";
import { fakeDb } from "../../../helpers/testing/fakeFirestore";
import { approveCompetitionGame } from "../../../helpers/approveCompetitionGame";
import {
  generateRoundRobinFixtures,
  generateSinglesRoundRobinFixtures,
} from "../../../helpers/Tournament/roundRobin";
import { generateInitialTeamStats } from "@shared/helpers";
import { reportTournamentGame } from "../../../helpers/Tournament/reportTournamentGame";
import {
  RR_SCENARIOS,
  courtSpread,
  expectedProfiles,
  fixedTeamsFor,
  replayStandings,
  scoreFor,
  strengthOrder,
} from "./roundRobin";

const player = (id) => ({
  ...scoreboardProfileSchema,
  userId: id,
  firstName: id,
  lastName: "x",
  username: id,
  displayName: id,
  XP: 0,
});
const singles = (count, numberOfCourts) =>
  generateSinglesRoundRobinFixtures({
    players: Array.from({ length: count }, (_, i) => player(`p${i}`)),
    numberOfCourts,
    competitionId: "c",
  }).fixtures;
const doubles = (teams, numberOfCourts) =>
  generateRoundRobinFixtures({
    teams: Array.from({ length: teams }, (_, i) => ({
      player1: player(`a${i}`),
      player2: player(`b${i}`),
    })),
    numberOfCourts,
    competitionId: "c",
  }).fixtures;

describe("courtSpread", () => {
  it("knows four entrants on two courts can't split evenly", () => {
    const { best } = courtSpread(singles(4, 2));
    expect(best).toBeGreaterThan(0);
  });

  it.each([
    ["singles, 4 on 2 courts", () => singles(4, 2)],
    ["singles, 6 on 2 courts", () => singles(6, 2)],
    ["singles, 6 on 3 courts", () => singles(6, 3)],
    ["doubles, 4 teams on 2 courts", () => doubles(4, 2)],
    ["doubles, 3 teams on 1 court", () => doubles(3, 1)],
  ])("the generator spreads courts as evenly as possible: %s", (_label, fixtures) => {
    const { generated, best } = courtSpread(fixtures());
    expect(best).not.toBeNull();
    expect(generated).toBe(best);
  });
});

// The seed's fixtures for a scenario (the test user owns it and joins first,
// then the fixture users in invite order), every game reported with the seed's
// scores and approved.
const TEST_USER_ID = "testuser";

const playedScenario = async (scenario) => {
  const testUserId = TEST_USER_ID;
  const ids = [testUserId, ...scenario.users.map((u) => u.userId)];
  const byId = new Map(ids.map((id) => [id, player(id)]));
  const isDoubles = scenario.type === "Doubles";
  const { fixtures } = isDoubles
    ? generateRoundRobinFixtures({
        teams: fixedTeamsFor(scenario, testUserId).map(([a, b]) => ({ player1: byId.get(a), player2: byId.get(b) })),
        numberOfCourts: 2,
        competitionId: "c",
      })
    : generateSinglesRoundRobinFixtures({ players: [...byId.values()], numberOfCourts: 2, competitionId: "c" });
  const order = strengthOrder(scenario, testUserId);
  const played = [];
  for (const round of fixtures) {
    const games = [];
    for (const game of round.games) {
      const [score1, score2] = scoreFor(game, order);
      let reported;
      await reportTournamentGame({
        game,
        score1,
        score2,
        tournamentType: scenario.type,
        tournamentName: scenario.name,
        tournamentId: "c",
        reporter: game.team1.player1,
        getUserById: async (id) => byId.get(id),
        sendNotification: async () => {},
        updateTournamentGame: async ({ updatedGame }) => {
          reported = updatedGame;
        },
      });
      games.push({ ...reported, approvalStatus: "approved" });
    }
    played.push({ ...round, games });
  }
  return {
    fixtures: played,
    participants: [...byId.values()],
    teams: isDoubles ? generateInitialTeamStats(played) : [],
    isDoubles,
  };
};

describe("replay scenarios", () => {
  it.each(["replaySingles", "replayDoubles"])(
    "%s: approving in reverse order would change the standings",
    async (key) => {
      const { orderMatters } = await replayStandings(await playedScenario(RR_SCENARIOS[key]));
      expect(orderMatters).toBe(true);
    },
  );
});

describe("expected profiles", () => {
  beforeEach(() => fakeDb.reset());

  it("oddDoubles approved in reverse order: the profiles approveCompetitionGame writes", async () => {
    const scenario = RR_SCENARIOS.oddDoubles;
    const { fixtures, participants, teams } = await playedScenario(scenario);
    const reported = getOrderedApprovedGames(fixtures).reverse();
    const pending = fixtures.map((round) => ({
      ...round,
      games: round.games.map((g) => ({
        ...g,
        approvalStatus: "Pending",
        reportedAt: new Date(Date.UTC(2026, 0, 1, 12, reported.findIndex((r) => r.gameId === g.gameId))).toISOString(),
      })),
    }));
    const testUserProfile = { ...profileDetailSchema, XP: 340 };
    await AsyncStorage.setItem(`maestro:rr:snapshot:${TEST_USER_ID}`, JSON.stringify(testUserProfile));
    participants.forEach((p) =>
      fakeDb.seed(`users/${p.userId}`, {
        userId: p.userId,
        username: p.username,
        profileDetail: p.userId === TEST_USER_ID ? testUserProfile : { ...profileDetailSchema },
      }),
    );
    fakeDb.seed("tournaments/T1", {
      tournamentName: scenario.name,
      tournamentType: "Doubles",
      tournamentMode: "Round Robin",
      approvalLimit: 1,
      fixtures: pending,
      tournamentParticipants: participants,
      tournamentTeams: teams,
    });
    for (const game of reported) {
      const approverId = game.team2.player1.userId;
      const outcome = await approveCompetitionGame({ isLeague: false, competitionId: "T1", gameId: game.gameId, approverId });
      expect(outcome.status).toBe("approved");
    }

    const stored = fakeDb.read("tournaments/T1");
    const expected = await expectedProfiles(
      stored,
      { userId: TEST_USER_ID },
      scenario,
      getOrderedApprovedGames(stored.fixtures),
      true,
    );
    participants.forEach(({ userId }) => {
      expect([userId, expected.get(userId).profileDetail.XP]).toEqual([userId, fakeDb.read(`users/${userId}`).profileDetail.XP]);
    });
  });
});
