import { formatCurrency, getLadderPreRegistrationOption } from "@shared";
import {
  formatEntryFee,
  formatPrizePool,
  getFullLadderPrizeTable,
  getLadderSizeRows,
  getLadderSummary,
  getPlatformFeeFootnote,
} from "./ladderPreRegistrationDisplay";

const gbp = (amount) => formatCurrency(amount, "GBP");
const cashSingles = getLadderPreRegistrationOption("cash-mens-singles");
const cashDoubles = getLadderPreRegistrationOption("cash-mens-doubles");
const communitySingles = getLadderPreRegistrationOption("community-singles");

describe("ladder pre-registration display", () => {
  it("advertises the whole entry-fee pot and discloses the fee charged on top", () => {
    expect(formatPrizePool(cashSingles)).toBe(gbp(40960));
    expect(getPlatformFeeFootnote(cashSingles)).toBe(
      "*A £2 platform fee is added on top of the £20 entry, so it's £22 to join. The full entry fee goes into the prize pool.",
    );
  });

  it("shows the community CP pool and CP per finish", () => {
    expect(formatPrizePool(communitySingles)).toBe("102,400 CP");
    const [champion] = getFullLadderPrizeTable(communitySingles);
    expect(champion.cash).toBe(0);
    expect(champion.cp).toBeGreaterThan(0);
    expect(formatEntryFee(communitySingles)).toBe("Free entry");
  });

  it("flags the cash entry fee for the footnote and says players or teams", () => {
    expect(formatEntryFee(cashSingles)).toBe("£20* entry");
    expect(formatEntryFee(cashDoubles)).toBe("£20* entry per team");
    expect(getLadderSummary(cashSingles)).toBe(
      "Up to 2,048 players · Top 64 win cash",
    );
    expect(getLadderSummary(cashDoubles)).toBe(
      "Up to 2,048 teams · Top 64 teams win cash",
    );
  });

  it("shows the full-ladder prize table from the shared payout split", () => {
    const rows = getFullLadderPrizeTable(cashSingles);
    expect(rows.map((row) => [row.fromPlace, row.toPlace, row.cash])).toEqual([
      [1, 1, 14352],
      [2, 2, 8192],
      [3, 3, 4096],
      [4, 4, 2048],
      [5, 32, 292],
      [33, 64, 128],
    ]);
    expect(
      rows.reduce(
        (sum, row) => sum + row.cash * (row.toPlace - row.fromPlace + 1),
        0,
      ),
    ).toBe(40960);
    expect(rows.map((row) => row.label)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "5th–32nd",
      "33rd–64th",
    ]);
  });

  it("shows how the pool and places scale with ladder size", () => {
    expect(getLadderSizeRows(cashSingles)).toEqual([
      { size: 2048, prizePool: gbp(40960), playoffSpots: 128, inTheMoney: 64 },
      { size: 1024, prizePool: gbp(20480), playoffSpots: 64, inTheMoney: 32 },
      { size: 512, prizePool: gbp(10240), playoffSpots: 32, inTheMoney: 16 },
      { size: 256, prizePool: gbp(5120), playoffSpots: 16, inTheMoney: 8 },
      { size: 128, prizePool: gbp(2560), playoffSpots: 8, inTheMoney: 8 },
    ]);
  });
});
