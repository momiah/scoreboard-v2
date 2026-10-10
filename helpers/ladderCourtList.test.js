import { buildLadderCourtSubmission } from "@shared/helpers";
import { buildLadderCourtList } from "./ladderCourtList";

const ladder = { ladderId: "L1", courtIds: ["verified-in", "unverified-in"] };

const court = (courtId, overrides = {}) => ({
  courtId,
  courtName: courtId,
  verified: true,
  location: {
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    postCode: "E1",
    address: "1 High St",
    latitude: null,
    longitude: null,
  },
  ...overrides,
});

const pendingFor = (ladderId, submittedBy) => ({
  verified: false,
  submission: buildLadderCourtSubmission({
    submittedBy,
    submittedByUsername: submittedBy,
    ladderId,
    ladderName: "Ladder",
  }),
});

const courts = [
  court("verified-in"),
  court("unverified-in", { verified: false }),
  court("verified-out"),
  court("pending-mine", pendingFor("L1", "u1")),
  court("pending-other", pendingFor("L1", "u2")),
  court("pending-other-ladder", pendingFor("L2", "u1")),
  court("approved", {
    ...pendingFor("L1", "u1"),
    submission: {
      ...pendingFor("L1", "u1").submission,
      status: "approved",
    },
  }),
];

describe("buildLadderCourtList", () => {
  it("only lets verified ladder courts be selected", () => {
    const { selectable } = buildLadderCourtList(courts, ladder, ["u1"]);
    expect(selectable.map((c) => c.courtId)).toEqual(["verified-in"]);
  });

  it("lists pending submissions for this ladder as awaiting verification", () => {
    const { items } = buildLadderCourtList(courts, ladder, ["u1"]);
    expect(items.map((i) => [i.key, !!i.awaitingVerification])).toEqual([
      ["verified-in", false],
      ["pending-mine", true],
      ["pending-other", true],
    ]);
  });

  it("pins a submission from any of the given submitters, such as a team mate", () => {
    const { items } = buildLadderCourtList(courts, ladder, ["u1", "u2"]);
    const pinned = items.filter((i) => i.pinned).map((i) => i.key);
    expect(pinned).toEqual(["pending-mine", "pending-other"]);
  });

  it("pins only the current user's own pending submissions", () => {
    const { items } = buildLadderCourtList(courts, ladder, ["u1"]);
    const pinned = items.filter((i) => i.pinned).map((i) => i.key);
    expect(pinned).toEqual(["pending-mine"]);
  });

  it("pins nothing when signed out", () => {
    const { items } = buildLadderCourtList(courts, ladder, []);
    expect(items.some((i) => i.pinned)).toBe(false);
  });
});
