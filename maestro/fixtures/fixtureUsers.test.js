jest.mock("../../services/firebase.config", () => ({ db: {} }));

const mockUpdates = [];
let mockUserDocs = [];

jest.mock("firebase/firestore", () => ({
  collection: (_db, ...path) => ({ path: path.join("/") }),
  doc: (_db, ...path) => ({ path: path.join("/") }),
  documentId: () => "__name__",
  getDocs: async () => ({ docs: mockUserDocs }),
  query: (ref) => ref,
  where: () => ({}),
  setDoc: async () => undefined,
  deleteDoc: async () => undefined,
  updateDoc: async (ref, data) => mockUpdates.push({ path: ref.path, data }),
}));

import {
  locationSchema,
  profileDetailSchema,
  userProfileSchema,
} from "courtchamps-shared";
import {
  FIXTURE_EMAIL_DOMAIN,
  FIXTURE_LOCATIONS,
  buildFixtureUser,
  fixtureLocationFor,
  isLocationMissing,
} from "./fixtureUsers";
import { backfillFixtureUserLocations } from "../../devFunctions/backfillFixtureUserLocations";

const userDoc = (id, data) => ({
  id,
  ref: { path: `users/${id}` },
  data: () => data,
});

describe("buildFixtureUser", () => {
  const user = buildFixtureUser({
    userId: "maestro-fixture-a",
    firstName: "Alex",
    lastName: "Fixture",
    username: "MaestroAlex",
  });

  it("has every field a real sign-up writes", () => {
    expect(Object.keys(user).sort()).toEqual(
      Object.keys(userProfileSchema).sort(),
    );
    expect(user.provider).toBe("email_password");
    expect(user.usernameLower).toBe("maestroalex");
    expect(user.profileDetail).toEqual(profileDetailSchema);
    expect(user.profileImage).toMatch(/^https:\/\//);
  });

  it("has a complete location and a non-deliverable email", () => {
    expect(isLocationMissing(user.location)).toBe(false);
    Object.keys(locationSchema).forEach((key) =>
      expect(user.location[key]).not.toBe(""),
    );
    expect(user.email).toBe(`maestro-fixture-a@${FIXTURE_EMAIL_DOMAIN}`);
  });

  it("gives the same user the same location every time", () => {
    expect(fixtureLocationFor("maestro-x")).toEqual(
      fixtureLocationFor("maestro-x"),
    );
  });

  it("spreads fixture users across the locations", () => {
    const cities = new Set(
      Array.from({ length: 40 }, (_, i) => fixtureLocationFor(`maestro-${i}`).city),
    );
    expect(cities.size).toBe(FIXTURE_LOCATIONS.length);
  });
});

describe("backfillFixtureUserLocations", () => {
  beforeEach(() => {
    mockUpdates.length = 0;
  });

  it("only fills locations that are missing and keeps existing values", async () => {
    const complete = fixtureLocationFor("maestro-complete");
    mockUserDocs = [
      userDoc("maestro-none", {}),
      userDoc("maestro-empty", { location: {} }),
      userDoc("maestro-partial", {
        location: { city: "York", latitude: 53.96 },
      }),
      userDoc("maestro-complete", { location: complete }),
    ];

    const outcome = await backfillFixtureUserLocations();

    expect(outcome).toEqual({ scanned: 4, updated: 3 });
    expect(mockUpdates.map(({ path }) => path)).toEqual([
      "users/maestro-none",
      "users/maestro-empty",
      "users/maestro-partial",
    ]);
    const partial = mockUpdates[2].data.location;
    expect(partial.city).toBe("York");
    expect(partial.latitude).toBe(53.96);
    expect(isLocationMissing(partial)).toBe(false);
  });
});
