// helpers/backfillLeagueGamesPlayersAndResult.test.js

/**
 * PURE TESTS — NO FIREBASE.
 * We reimplement the minimal pure logic needed to:
 * - formatDisplayName
 * - toPlayerObject
 * - buildParticipantLookup
 * - findUserByUsernameLower (pure array search)
 * - resolvePlayerValue
 * - rebuildResultPlayers
 * - transformGame (single game)
 *
 * Then we run two scenarios:
 * 1) Game stores usernames as strings
 * 2) Game stores formatted names as strings
 */

// import { formatDisplayName } from "../helpers/formatDisplayName";
import {
  toPlayerObject,
  buildParticipantLookup,
  resolvePlayerValue,
  rebuildResultPlayers,
} from "./backfillLeagueGames";

// Mock participants and users
const mockUsers = [
  { userId: "u1", username: "ahmadali", firstName: "Ahmad", lastName: "Ali" },
  {
    userId: "u2",
    username: "ritishmahi",
    firstName: "Ritish",
    lastName: "Mahi",
  },
  { userId: "u3", username: "sarak", firstName: "Sara", lastName: "Khan" },
  { userId: "u4", username: "tomlee", firstName: "Tom", lastName: "Lee" },
];

const mockParticipants = [...mockUsers];

const transformGame = async (game, leagueType, participants, users) => {
  const participantLookup = buildParticipantLookup(participants);

  const oldTeam1 = game.team1 || {};
  const oldTeam2 = game.team2 || {};

  const team1Player1 = await resolvePlayerValue(
    oldTeam1.player1,
    participantLookup,
    users
  );
  const team1Player2 =
    leagueType === "Doubles"
      ? await resolvePlayerValue(oldTeam1.player2, participantLookup, users)
      : null;

  const team2Player1 = await resolvePlayerValue(
    oldTeam2.player1,
    participantLookup,
    users
  );
  const team2Player2 =
    leagueType === "Doubles"
      ? await resolvePlayerValue(oldTeam2.player2, participantLookup, users)
      : null;

  const newTeam1 = {
    ...oldTeam1,
    player1: team1Player1,
    player2: leagueType === "Doubles" ? team1Player2 : null,
    score: Number(oldTeam1.score ?? 0),
  };

  const newTeam2 = {
    ...oldTeam2,
    player1: team2Player1,
    player2: leagueType === "Doubles" ? team2Player2 : null,
    score: Number(oldTeam2.score ?? 0),
  };

  const newResult = rebuildResultPlayers(leagueType, newTeam1, newTeam2);

  return { ...game, team1: newTeam1, team2: newTeam2, result: newResult };
};

describe("backfillLeagueGamesPlayersAndResult helpers", () => {
  test("toPlayerObject builds normalized object with displayName", () => {
    const input = {
      userId: "u1",
      firstName: "ahmad",
      lastName: "ali",
      username: "ahmadali",
    };
    const result = toPlayerObject(input);
    expect(result).toEqual({
      userId: "u1",
      firstName: "ahmad",
      lastName: "ali",
      username: "ahmadali",
      displayName: "Ahmad A",
    });
  });
  test("Doubles: players stored as USERNAMES → resolves to full objects and result uses display names", async () => {
    const oldGame = {
      id: "g1",
      team1: { player1: "ahmadali", player2: "sarak", score: 21 },
      team2: { player1: "ritishmahi", player2: "tomlee", score: 17 },
      result: {},
    };

    const newGame = await transformGame(
      oldGame,
      "Doubles",
      mockParticipants,
      mockUsers
    );

    expect(newGame.team1.player1.displayName).toBe("Ahmad A");
    expect(newGame.team1.player2.displayName).toBe("Sara K");
    expect(newGame.team2.player1.displayName).toBe("Ritish M");
    expect(newGame.team2.player2.displayName).toBe("Tom L");

    expect(newGame.result).toEqual({
      winner: { team: "Team 1", players: ["Ahmad A", "Sara K"], score: 21 },
      loser: { team: "Team 2", players: ["Ritish M", "Tom L"], score: 17 },
    });
  });

  test("Doubles: players stored as FORMATTED NAMES → resolves via participants and result uses display names", async () => {
    const oldGame = {
      id: "g2",
      team1: { player1: "Ahmad A", player2: "Sara K", score: 15 },
      team2: { player1: "Ritish M", player2: "Tom L", score: 21 },
      result: {},
    };

    const newGame = await transformGame(
      oldGame,
      "Doubles",
      mockParticipants,
      mockUsers
    );

    expect(newGame.team1.player1.displayName).toBe("Ahmad A");
    expect(newGame.team1.player2.displayName).toBe("Sara K");
    expect(newGame.team2.player1.displayName).toBe("Ritish M");
    expect(newGame.team2.player2.displayName).toBe("Tom L");

    expect(newGame.result).toEqual({
      winner: { team: "Team 2", players: ["Ritish M", "Tom L"], score: 21 },
      loser: { team: "Team 1", players: ["Ahmad A", "Sara K"], score: 15 },
    });
  });
});
