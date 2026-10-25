import {
  formatEntryFee,
  formatPrizePool,
  getFullLadderPrizeTable,
  getLadderSummary,
  getPlatformFeeFootnote,
  isCashLadder,
} from "./ladderPreRegistrationDisplay";
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
  });

  it("shows the community CP pool and CP per finish", () => {
    expect(formatPrizePool(communitySingles)).toBe("102,400 CP");
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
      ["1st", 14352],
      ["2nd", 8192],
      ["3rd", 4096],
      ["4th", 2048],
      ["5th–32nd", 292],
      ["33rd–64th", 128],
    ]);
  });
});
