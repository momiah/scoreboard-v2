import { getLadderPrizeTable } from "./ladderPlayoffPrizes";

describe("getLadderPrizeTable", () => {
  it("labels places like every other prize table, and a cash ladder's table ends at its last cash place", () => {
    const rows = getLadderPrizeTable({
      entryFee: 20,
      participantCount: 2048,
      maxPlayers: 2048,
      payoutStructure: "linear",
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
    ]);
    expect(rows[rows.length - 1].cash).toBeGreaterThan(0);
  });
});
