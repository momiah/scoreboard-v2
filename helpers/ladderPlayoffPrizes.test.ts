import { getLadderPrizeTable } from "./ladderPlayoffPrizes";

describe("getLadderPrizeTable", () => {
  it("labels places like every other prize table: 1st to 4th, then Joint Nth per round", () => {
    const rows = getLadderPrizeTable({
      entryFee: 20,
      participantCount: 2048,
      maxPlayers: 2048,
    });
    expect(rows.map((row) => row.label)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "Joint 5th",
      "Joint 9th",
      "Joint 17th",
      "Joint 33rd",
      "Joint 65th",
    ]);
    expect(rows[rows.length - 1].cash).toBe(0);
    expect(rows[rows.length - 1].cp).toBeGreaterThan(0);
  });
});
