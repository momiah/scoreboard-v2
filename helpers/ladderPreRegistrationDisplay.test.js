import { getLadderPreRegistrationOption } from "@shared";
import {
  PRIZE_POOL_FOOTNOTE,
  formatEntryFee,
  formatPayoutPlaces,
  formatPrizePool,
  getFullLadderPayouts,
  getLadderSizeRows,
  getLadderSummary,
} from "./ladderPreRegistrationDisplay";
import { formatCurrency } from "./formatCurrency";

const cashSingles = getLadderPreRegistrationOption("cash-mens-singles");
const cashDoubles = getLadderPreRegistrationOption("cash-mens-doubles");
const communitySingles = getLadderPreRegistrationOption("community-singles");

describe("ladder pre-registration display", () => {
  it("advertises the cash pot before the platform fee and states the fee", () => {
    expect(formatPrizePool(cashSingles)).toBe("£40,960");
    expect(PRIZE_POOL_FOOTNOTE).toBe(
      "*Prize pool and payouts are shown before the 10% platform fee.",
    );
  });

  it("shows the community CP pool", () => {
    expect(formatPrizePool(communitySingles)).toBe("102,400 CP");
    expect(formatEntryFee(communitySingles)).toBe("Free entry");
  });

  it("describes cash entry and paid places for singles and doubles", () => {
    expect(formatEntryFee(cashSingles)).toBe("£20 entry");
    expect(formatEntryFee(cashDoubles)).toBe("£20 entry per team");
    expect(getLadderSummary(cashSingles)).toBe(
      "Up to 2,048 players · Top 64 win cash",
    );
    expect(getLadderSummary(cashDoubles)).toBe(
      "Up to 2,048 teams · Top 64 teams win cash",
    );
  });

  it("lists the full-ladder prize breakdown", () => {
    expect(
      getFullLadderPayouts(cashSingles).map((payout) => [
        formatPayoutPlaces(payout),
        formatCurrency(payout.each, "GBP"),
      ]),
    ).toEqual([
      ["1st", "£14,336"],
      ["2nd", "£8,192"],
      ["3rd", "£4,096"],
      ["4th", "£2,048"],
      ["5th–32nd", "£292.57"],
      ["33rd–64th", "£128"],
    ]);
  });

  it("shows how the pool and places scale with ladder size", () => {
    expect(getLadderSizeRows(cashSingles)).toEqual([
      { size: 2048, prizePool: "£40,960", playoffSpots: 128, inTheMoney: 64 },
      { size: 1024, prizePool: "£20,480", playoffSpots: 64, inTheMoney: 32 },
      { size: 512, prizePool: "£10,240", playoffSpots: 32, inTheMoney: 16 },
      { size: 256, prizePool: "£5,120", playoffSpots: 16, inTheMoney: 8 },
      { size: 128, prizePool: "£2,560", playoffSpots: 8, inTheMoney: 8 },
    ]);
  });
});
