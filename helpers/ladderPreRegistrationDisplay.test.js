import {
  formatEntryFee,
  formatPrizePool,
  getFullLadderPrizeTable,
  getLadderSummary,
  getPlatformFeeFootnote,
  getPlatformFeeRateFootnote,
  isCashLadder,
} from "./ladderPreRegistrationDisplay";
import { LADDER_XP_PER_PLAYER } from "courtchamps-shared";
const details = (overrides) => ({
  name: "Ladder",
  description: "",
  image: "",
  region: "United Kingdom",
  countryCode: "GB",
  currencyType: "GBP",
  maxPlayers: 2048,
  genderType: "Mens",
  ...overrides,
});
const cashSingles = details({ ladderType: "Singles", entryFee: 20 });
const cashDoubles = details({ ladderType: "Doubles", entryFee: 20 });
const communitySingles = details({
  ladderType: "Singles",
  entryFee: 0,
  genderType: "Mixed",
});

describe("ladder pre-registration display", () => {
  it("treats a pre-registration with an entry fee as a Cash Ladder", () => {
    expect(isCashLadder(cashSingles)).toBe(true);
    expect(isCashLadder(communitySingles)).toBe(false);
  });

  it("advertises the whole entry-fee pot and discloses the fee charged on top", () => {
    expect(formatPrizePool(cashSingles)).toBe("£40,960");
    expect(getPlatformFeeFootnote(cashSingles)).toBe(
      "*A £2 platform fee is added on top of the £20 entry. The full entry fee goes into the prize pool.",
    );
    expect(
      getPlatformFeeFootnote(details({ ladderType: "Doubles", entryFee: 40 })),
    ).toBe(
      "*A £4 platform fee is added on top of the £40 entry. The full entry fee goes into the prize pool.",
    );
  });

  it("states the fee as a rate when a list mixes entry fees", () => {
    expect(getPlatformFeeRateFootnote()).toBe(
      "*A 10% platform fee is added on top of each entry fee. The full entry fee goes into the prize pool.",
    );
  });

  it("shows the community CP pool and CP per finish", () => {
    expect(formatPrizePool(communitySingles)).toBe(
      `${(2048 * LADDER_XP_PER_PLAYER).toLocaleString("en-GB")} CP`,
    );
    expect(formatEntryFee(communitySingles)).toBe("Free entry");
    const [champion] = getFullLadderPrizeTable(communitySingles);
    expect(champion.cash).toBe(0);
    expect(champion.cp).toBeGreaterThan(0);
  });

  it("describes the entry fee and size for players and teams", () => {
    expect(formatEntryFee(cashSingles)).toBe("£20* entry");
    expect(formatEntryFee(cashDoubles)).toBe("£20* entry per team");
    expect(getLadderSummary(cashSingles)).toBe(
      "Up to 2,048 players · Top 64 win cash",
    );
    expect(getLadderSummary(cashDoubles)).toBe(
      "Up to 2,048 teams · Top 64 teams win cash",
    );
    expect(getLadderSummary(communitySingles)).toBe("Up to 2,048 players");
  });

  it("shows the full-ladder prize table from the shared payout split", () => {
    const rows = getFullLadderPrizeTable(cashSingles);
    expect(rows.map((row) => [row.label, row.cash])).toEqual([
      ["1st", 10683],
      ["2nd", 6553],
      ["3rd", 4096],
      ["4th", 2048],
      ["Quarter-Final (Joint 5th)", 819],
      ["Round of 16 (Joint 9th)", 460],
      ["Round of 32 (Joint 17th)", 256],
      ["Round of 64 (Joint 33rd)", 204],
      ["Round of 128 (Joint 65th)", 0],
    ]);
  });
});
