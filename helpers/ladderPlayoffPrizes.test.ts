import { getLadderPrizeTable } from "./ladderPlayoffPrizes";

describe("getLadderPrizeTable", () => {
  it("labels places like every other prize table: 1st to 4th, then the round and its joint place", () => {
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
      "Quarter-Final (Joint 5th)",
      "Round of 16 (Joint 9th)",
      "Round of 32 (Joint 17th)",
      "Round of 64 (Joint 33rd)",
      "Round of 128 (Joint 65th)",
    ]);
    expect(rows[rows.length - 1].cash).toBe(0);
    expect(rows[rows.length - 1].cp).toBeGreaterThan(0);
  });
});
