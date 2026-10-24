import { prizeTypes } from "@shared";
import { normalizeCompetitionData } from "./normalizeCompetitionData";

const normalizedPrizeType = (rawData) =>
  normalizeCompetitionData({ rawData, competitionType: "league" }).prizeType;

describe("normalizeCompetitionData prizeType", () => {
  it.each(["Trophy", "Medal", "Community", undefined])(
    "reads a free competition stored as %p as Community",
    (prizeType) => {
      expect(normalizedPrizeType({ prizeType })).toBe(prizeTypes.COMMUNITY);
    },
  );

  it("reads a competition with an entry fee as Cash", () => {
    expect(normalizedPrizeType({ prizeType: "Trophy", entryFee: 10 })).toBe(
      prizeTypes.CASH,
    );
  });
});
