jest.mock("../../services/firebase.config", () => ({ db: {} }));
jest.mock("firebase/firestore", () => require("../testing/fakeFirestore").firestoreMock);

import moment from "moment";
import { fakeDb } from "../testing/fakeFirestore";
import { league, player, user } from "../testing/leagueFixtures";
import { reportLeagueGame } from "./reportLeagueGame";

const today = moment().format("DD-MM-YYYY");
const seed = (overrides = {}) =>
  fakeDb.seed("leagues/maestro-L1", {
    ...league({ leagueId: "maestro-L1", ids: ["a", "b", "c", "d"] }),
    startDate: today,
    endDate: moment().add(1, "month").format("DD-MM-YYYY"),
    ...overrides,
  });

const report = (args) => {
  const sendNotification = jest.fn(async () => undefined);
  return reportLeagueGame({
    leagueId: "maestro-L1",
    team1Players: [player("a")],
    team2Players: [player("b")],
    score1: 21,
    score2: 15,
    reporter: user("a"),
    sendNotification,
    ...args,
  }).then((result) => ({ result, sendNotification }));
};

beforeEach(() => fakeDb.reset());

describe("reportLeagueGame", () => {
  it("saves a pending game and notifies only the opponent", async () => {
    seed();
    const { result, sendNotification } = await report();

    expect(result.game).toMatchObject({ approvalStatus: "Pending", reporter: "a", gamescore: "21 - 15" });
    expect(fakeDb.read("leagues/maestro-L1").games.map((g) => g.gameId)).toEqual([result.game.gameId]);
    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification.mock.calls[0][0]).toMatchObject({
      recipientId: "b",
      senderId: "a",
      type: "add-league-game",
      data: { leagueId: "maestro-L1", gameId: result.game.gameId },
    });
  });

  it("doubles: notifies both opponents, never the reporter's partner", async () => {
    seed({ leagueType: "Doubles" });
    const { sendNotification } = await report({
      team1Players: [player("a"), player("b")],
      team2Players: [player("c"), player("d")],
    });
    expect(sendNotification.mock.calls.map(([n]) => n.recipientId)).toEqual(["c", "d"]);
  });

  it("keeps games saved by others and gives each a unique id", async () => {
    seed();
    const first = await report();
    const second = await report({ team1Players: [player("c")], team2Players: [player("d")], reporter: user("c") });
    const ids = fakeDb.read("leagues/maestro-L1").games.map((g) => g.gameId);
    expect(ids).toEqual([first.result.game.gameId, second.result.game.gameId]);
    expect(new Set(ids).size).toBe(2);
  });

  it.each([
    ["invalid score", { score1: 21, score2: 20 }, "At 21 points"],
    ["reporter not playing", { reporter: user("c") }, "must be a participant"],
    ["same player on both teams", { team2Players: [player("a")] }, "only be on one team"],
    ["player outside the league", { team2Players: [player("z")] }, "must be in the league"],
  ])("refuses %s and notifies nobody", async (_name, args, message) => {
    seed();
    const { result, sendNotification } = await report(args);
    expect(result.error).toContain(message);
    expect(sendNotification).not.toHaveBeenCalled();
    expect(fakeDb.read("leagues/maestro-L1").games).toEqual([]);
  });

  it("refuses an ended league", async () => {
    seed({ endDate: moment().subtract(1, "day").format("DD-MM-YYYY") });
    const { result, sendNotification } = await report();
    expect(result.error).toBe("This league has ended.");
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
