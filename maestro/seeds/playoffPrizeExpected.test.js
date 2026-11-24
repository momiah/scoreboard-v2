import {
  getLadderPlacePrize,
  formatLadderPrizeWon,
} from "@shared/helpers";
import { getPlayoffPrizeExpected } from "./playoffPrizeExpected";

jest.mock("../../services/firebase.config", () => ({ db: {} }));

const unescape = (pattern) => pattern.replace(/\\(.)/g, "$1");

describe("getPlayoffPrizeExpected", () => {
  it("pays the free ladder linearly, so a Round of 16 loser wins CP", () => {
    const expected = getPlayoffPrizeExpected({
      ladderName: "Maestro Playoffs 256",
      entryFee: 0,
      size: 256,
    });
    expect(expected.payoutStructure).toBe("linear");
    expect(expected.lastBand).toBe("Joint 9th");
    const cp = getLadderPlacePrize(
      { entryFee: 0, participantCount: 256, maxPlayers: 256, payoutStructure: "linear" },
      16,
    ).cp;
    expect(cp).toBeGreaterThan(0);
    expect(unescape(expected.roundOf16Out)).toBe(
      `knocked out in the Round of 16 of Maestro Playoffs 256. You've been awarded ${cp.toLocaleString("en-GB")} CP, paid when the playoffs finish.`,
    );
  });

  it("pays the paid ladder progressively, with nothing for a Round of 16 loser", () => {
    const ladder = { entryFee: 20, participantCount: 256, maxPlayers: 256, payoutStructure: "progressive" };
    const expected = getPlayoffPrizeExpected({
      ladderName: "Maestro Playoffs 256 (Paid)",
      entryFee: 20,
      size: 256,
    });
    expect(expected.payoutStructure).toBe("progressive");
    expect(expected.lastBand).toBe("Joint 5th");
    expect(expected.roundOf16Out).toBe(
      "knocked out in the Round of 16 of Maestro Playoffs 256 \\(Paid\\)\\.",
    );
    expect(new RegExp(expected.finished4).test(
      `you finished 4th in Maestro Playoffs 256 (Paid) and been awarded ${formatLadderPrizeWon(getLadderPlacePrize(ladder, 4), "GBP")}.`,
    )).toBe(true);
  });
});
