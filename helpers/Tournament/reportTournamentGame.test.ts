import { reportTournamentGame } from "./reportTournamentGame";
import { Game, UserProfile } from "@shared/types";

const player = (userId: string) =>
  ({ userId, username: userId, firstName: userId, lastName: "" }) as never;

const scheduledGame = (team1: string[], team2: string[]) =>
  ({
    gameId: "g1",
    gameNumber: 1,
    court: 1,
    team1: { player1: player(team1[0]), player2: team1[1] ? player(team1[1]) : null },
    team2: { player1: player(team2[0]), player2: team2[1] ? player(team2[1]) : null },
    approvalStatus: "Scheduled",
    approvers: [],
  }) as unknown as Game;

const report = ({
  game = scheduledGame(["a"], ["b"]),
  updateTournamentGame = jest.fn(async () => ({ success: true })),
}: {
  game?: Game;
  updateTournamentGame?: jest.Mock;
} = {}) => {
  const calls: string[] = [];
  const sendNotification = jest.fn(async (payload: Record<string, unknown>) => {
    calls.push(`notify:${payload.recipientId}`);
  });
  const update = jest.fn(async (args: unknown) => {
    calls.push("save");
    return updateTournamentGame(args);
  });
  const run = reportTournamentGame({
    game,
    score1: 21,
    score2: 15,
    tournamentType: game.team1.player2 ? "Doubles" : "Singles",
    tournamentName: "Cup",
    tournamentId: "t1",
    reporter: { userId: "a", username: "a", firstName: "a", lastName: "" } as UserProfile,
    getUserById: async (userId: string) => ({ userId }),
    sendNotification,
    updateTournamentGame: update,
  });
  return { run, calls, sendNotification, update };
};

describe("reportTournamentGame", () => {
  it("saves the pending game before notifying the opponent", async () => {
    const { run, calls, update } = report();
    await run;
    expect(calls).toEqual(["save", "notify:b"]);
    expect(update.mock.calls[0][0]).toMatchObject({
      tournamentId: "t1",
      gameId: "g1",
      updatedGame: { approvalStatus: "Pending", reporter: "a", gamescore: "21-15" },
    });
  });

  it("doubles: notifies both opponents and never the reporter's partner", async () => {
    const { run, calls } = report({ game: scheduledGame(["a", "p"], ["c", "d"]) });
    await run;
    expect(calls).toEqual(["save", "notify:c", "notify:d"]);
  });

  it("notifies nobody when the game was already reported", async () => {
    const { run, sendNotification } = report({
      updateTournamentGame: jest.fn(async () => {
        throw new Error(
          "This game has already been reported. Please refresh to see the latest status.",
        );
      }),
    });
    await expect(run).rejects.toThrow("already been reported");
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
