import {
  LADDER_HOME_COURT_MAX_CHANGES,
  hasLadderHomeCourt,
  canChangeLadderHomeCourt,
  nextLadderHomeCourtChanges,
  isSelectableLadderHomeCourt,
  selectableLadderHomeCourts,
  toLadderHomeCourt,
} from "./ladderHomeCourt";

const homeCourt = { courtId: "c1", courtName: "Court 1", location: {} };

const court = (courtId, overrides = {}) => ({
  courtId,
  courtName: ` ${courtId} name `,
  verified: true,
  location: {
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "E1 1AA",
    address: "1 High St",
    latitude: 51.5,
    longitude: -0.1,
  },
  ...overrides,
});

describe("hasLadderHomeCourt", () => {
  it("is false without a home court", () => {
    expect(hasLadderHomeCourt(null)).toBe(false);
    expect(hasLadderHomeCourt({})).toBe(false);
    expect(hasLadderHomeCourt({ homeCourt: null })).toBe(false);
  });

  it("is true once a court is set", () => {
    expect(hasLadderHomeCourt({ homeCourt })).toBe(true);
  });
});

describe("canChangeLadderHomeCourt", () => {
  it("allows the first selection", () => {
    expect(canChangeLadderHomeCourt({})).toBe(true);
  });

  it("allows one change after the first selection", () => {
    expect(canChangeLadderHomeCourt({ homeCourt, homeCourtChanges: 0 })).toBe(
      true,
    );
    expect(canChangeLadderHomeCourt({ homeCourt })).toBe(true);
  });

  it("blocks further changes once the change is used", () => {
    expect(
      canChangeLadderHomeCourt({
        homeCourt,
        homeCourtChanges: LADDER_HOME_COURT_MAX_CHANGES,
      }),
    ).toBe(false);
  });
});

describe("nextLadderHomeCourtChanges", () => {
  it("starts at 0 for the first selection", () => {
    expect(nextLadderHomeCourtChanges({})).toBe(0);
  });

  it("counts a change once a court is already set", () => {
    expect(nextLadderHomeCourtChanges({ homeCourt, homeCourtChanges: 0 })).toBe(
      1,
    );
  });
});

describe("isSelectableLadderHomeCourt", () => {
  it("accepts a verified court in the ladder", () => {
    expect(isSelectableLadderHomeCourt(court("c1"), ["c1"])).toBe(true);
  });

  it("rejects a court outside the ladder", () => {
    expect(isSelectableLadderHomeCourt(court("c2"), ["c1"])).toBe(false);
    expect(isSelectableLadderHomeCourt(court("c1"), undefined)).toBe(false);
  });

  it("rejects an unverified court even when it is in the ladder", () => {
    expect(
      isSelectableLadderHomeCourt(court("c1", { verified: false }), ["c1"]),
    ).toBe(false);
  });
});

describe("selectableLadderHomeCourts", () => {
  it("keeps only verified ladder courts", () => {
    const courts = [
      court("c1"),
      court("c2", { verified: false }),
      court("c3"),
    ];
    expect(
      selectableLadderHomeCourts(courts, ["c1", "c2"]).map((c) => c.courtId),
    ).toEqual(["c1"]);
  });
});

describe("toLadderHomeCourt", () => {
  it("stores the court id, trimmed name and full location", () => {
    expect(toLadderHomeCourt(court("c1"))).toEqual({
      courtId: "c1",
      courtName: "c1 name",
      location: {
        city: "London",
        country: "United Kingdom",
        countryCode: "GB",
        postCode: "E1 1AA",
        address: "1 High St",
        latitude: 51.5,
        longitude: -0.1,
      },
    });
  });

  it("fills missing location fields", () => {
    expect(toLadderHomeCourt(court("c1", { location: undefined })).location)
      .toEqual({
        city: "",
        country: "",
        countryCode: "",
        postCode: "",
        address: "",
        latitude: null,
        longitude: null,
      });
  });
});
