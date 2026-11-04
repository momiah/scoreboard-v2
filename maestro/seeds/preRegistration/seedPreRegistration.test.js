const mockStore = new Map();
let mockFailUpdates = new Set();

class MockSnap {
  constructor(path) {
    this.id = path.split("/").pop();
    this.ref = { path };
    this._path = path;
  }
  exists() {
    return mockStore.has(this._path);
  }
  data() {
    return mockStore.get(this._path);
  }
}
const mockSnap = (path) => new MockSnap(path);

jest.mock("../../../services/firebase.config", () => ({ db: {} }));
jest.mock("../../../helpers/ladderPreRegistrationDisplay", () => {
  const actual = jest.requireActual("courtchamps-shared/helpers");
  const shared = jest.requireActual("courtchamps-shared");
  return {
    getPlatformFeeFootnote: (details) => {
      const { entryFee, platformFee } = shared.getLadderEntryPrice(details.entryFee);
      return `*A ${shared.formatCurrency(platformFee, details.currencyType)} platform fee is added on top of the ${shared.formatCurrency(entryFee, details.currencyType)} entry.`;
    },
    getHeadlinePreRegistration: (list) => {
      const cash = list.filter(actual.isCashLadder);
      const pool = actual.getLadderPrizePoolAtSize;
      return (cash.length ? cash : list)
        .slice()
        .sort((a, b) => (cash.length ? pool(b).cash - pool(a).cash : pool(b).xp - pool(a).xp))[0];
    },
  };
});
jest.mock("firebase/firestore", () => {
  const join = (parts) => parts.filter(Boolean).join("/");
  return {
    collection: (parent, ...path) => ({ path: join([parent?.path, ...path]) }),
    doc: (parent, ...path) => ({ path: join([parent?.path, ...path]) }),
    query: (ref, ...filters) => ({ ...ref, filters }),
    where: (field, op, value) => ({ field, op, value }),
    serverTimestamp: () => new Date(),
    getDoc: async (ref) => mockSnap(ref.path),
    getDocs: async (ref) => {
      const depth = ref.path.split("/").length + 1;
      const docs = [...mockStore.keys()]
        .filter((key) => key.startsWith(`${ref.path}/`) && key.split("/").length === depth)
        .map(mockSnap)
        .filter((snap) =>
          (ref.filters ?? []).every(({ field, value }) => {
            const actual = field.split(".").reduce((v, k) => v?.[k], snap.data());
            return actual === value;
          }),
        );
      return { docs, size: docs.length };
    },
    setDoc: async (ref, data, options) => {
      mockStore.set(ref.path, options?.merge ? { ...mockStore.get(ref.path), ...data } : data);
    },
    updateDoc: async (ref, data) => {
      if (mockFailUpdates.has(ref.path)) throw new Error("permission-denied");
      if (!mockStore.has(ref.path)) throw new Error("not-found");
      mockStore.set(ref.path, { ...mockStore.get(ref.path), ...data });
    },
    deleteDoc: async (ref) => {
      mockStore.delete(ref.path);
    },
    writeBatch: () => {
      const ops = [];
      return {
        set: (ref, data) => ops.push(() => mockStore.set(ref.path, data)),
        commit: async () => ops.forEach((op) => op()),
      };
    },
  };
});

import {
  PREREG_SCENARIO,
  cleanupPreRegistrationTestData,
  closeLivePreRegistrations,
  restoreLivePreRegistrations,
  seedPreRegistration,
} from "./seedPreRegistration";
import {
  MAESTRO_PREREG_BACKUP_ID,
  PREREG_FIXTURES,
  PREREG_FIXTURE_USER_IDS,
} from "./preRegistrationFixtures";

const COLLECTION = "ladderPreRegistrations";
const testUser = { userId: "test-user", username: "tester", profileImage: "img" };
const LIVE = ["launch-cash-mens-doubles", "launch-cash-mens-singles", "launch-community-doubles", "launch-community-singles"];
const liveDoc = (entryFee) => ({
  name: "Live",
  description: "",
  image: "",
  region: "United Kingdom",
  city: "London",
  countryCode: "GB",
  ladderType: "Singles",
  genderType: "Mens",
  entryFee,
  currencyType: "GBP",
  maxPlayers: 2048,
  status: "open",
  expectedOpensAt: null,
  ladderId: null,
  notifiedAt: null,
  createdBy: "admin",
  createdAt: new Date(),
  updatedBy: "admin",
  updatedAt: new Date(),
});
const status = (id) => mockStore.get(`${COLLECTION}/${id}`)?.status;

beforeEach(() => {
  mockStore.clear();
  mockFailUpdates = new Set();
  LIVE.forEach((id, i) => mockStore.set(`${COLLECTION}/${id}`, liveDoc(i < 2 ? 20 : 0)));
  mockStore.set(`${COLLECTION}/live-already-closed`, { ...liveDoc(0), status: "closed" });
});

describe("live pre-registration backup", () => {
  it("closes only open live pre-registrations and restores their exact status", async () => {
    await closeLivePreRegistrations({ actorUserId: "test-user" });
    LIVE.forEach((id) => expect(status(id)).toBe("closed"));
    expect(mockStore.get(`${COLLECTION}/${MAESTRO_PREREG_BACKUP_ID}`).status).toBe("closed");

    const { restored } = await restoreLivePreRegistrations();
    expect(restored.sort()).toEqual([...LIVE].sort());
    LIVE.forEach((id) => expect(status(id)).toBe("open"));
    expect(status("live-already-closed")).toBe("closed");
    expect(mockStore.has(`${COLLECTION}/${MAESTRO_PREREG_BACKUP_ID}`)).toBe(false);
  });

  it("never overwrites the backup, so closing twice still restores 'open'", async () => {
    await closeLivePreRegistrations({ actorUserId: "test-user" });
    await closeLivePreRegistrations({ actorUserId: "test-user" });
    await restoreLivePreRegistrations();
    LIVE.forEach((id) => expect(status(id)).toBe("open"));
  });

  it("fails loudly and keeps the backup when a restore write fails", async () => {
    await closeLivePreRegistrations({ actorUserId: "test-user" });
    mockFailUpdates.add(`${COLLECTION}/${LIVE[0]}`);
    await expect(restoreLivePreRegistrations()).rejects.toThrow(/CLEANUP INCOMPLETE/);
    expect(mockStore.has(`${COLLECTION}/${MAESTRO_PREREG_BACKUP_ID}`)).toBe(true);
    mockFailUpdates.clear();
    await restoreLivePreRegistrations();
    LIVE.forEach((id) => expect(status(id)).toBe("open"));
  });

  it("is a no-op when nothing was closed", async () => {
    await expect(restoreLivePreRegistrations()).resolves.toEqual({ restored: [] });
  });
});

describe("seedPreRegistration", () => {
  it("writes fixtures with every field a live pre-registration has", async () => {
    await seedPreRegistration({ testUser });
    const liveKeys = Object.keys(liveDoc(0)).sort();
    Object.values(PREREG_FIXTURES).forEach(({ preRegistrationId }) =>
      expect(Object.keys(mockStore.get(`${COLLECTION}/${preRegistrationId}`)).sort()).toEqual(liveKeys),
    );
    LIVE.forEach((id) => expect(status(id)).toBe("open"));
  });

  it("gives every registrant a fixture user with a location, and none on the empty fixture", async () => {
    await seedPreRegistration({ testUser });
    PREREG_FIXTURE_USER_IDS.forEach((id) =>
      expect(mockStore.get(`users/${id}`).location.city).not.toBe(""),
    );
    const registrantsOf = (key) =>
      [...mockStore.keys()].filter((k) =>
        k.startsWith(`${COLLECTION}/${PREREG_FIXTURES[key].preRegistrationId}/registrants/`),
      );
    expect(registrantsOf("cashDoubles")).toHaveLength(5);
    expect(registrantsOf("communitySingles")).toHaveLength(0);
  });

  it("gives fixture registrants usernames a real sign-up would accept", async () => {
    const { getUsernameRuleError } = jest.requireActual("courtchamps-shared/helpers");
    await seedPreRegistration({ testUser });
    PREREG_FIXTURE_USER_IDS.forEach((id) =>
      expect(getUsernameRuleError(mockStore.get(`users/${id}`).username)).toBeNull(),
    );
  });

  it("headlines the biggest fixture cash pool when only fixtures are open", async () => {
    const { expected } = await seedPreRegistration({ testUser, scenario: PREREG_SCENARIO.ONLY_FIXTURES });
    expect(expected["banner-headline"]).toBe(PREREG_FIXTURES.cashSingles.preRegistrationId);
    expect(expected["banner-pool"]).toBe(expected["cash-singles-pool"]);
    await restoreLivePreRegistrations();
  });

  it("headlines a CP pool when only community fixtures are open", async () => {
    const { expected } = await seedPreRegistration({ testUser, scenario: PREREG_SCENARIO.COMMUNITY_ONLY });
    expect(expected["banner-pool"]).toMatch(/CP$/);
    expect(status(PREREG_FIXTURES.cashDoubles.preRegistrationId)).toBe("closed");
    await restoreLivePreRegistrations();
  });

  it("leaves nothing open for none-open", async () => {
    const { open, expected } = await seedPreRegistration({ testUser, scenario: PREREG_SCENARIO.NONE_OPEN });
    expect(open).toBe(0);
    expect(expected["banner-pool"]).toBe("");
    await restoreLivePreRegistrations();
  });

  it("registers the test user only when asked, and re-seeding takes them off again", async () => {
    const path = `${COLLECTION}/${PREREG_FIXTURES.cashDoubles.preRegistrationId}/registrants/test-user`;
    await seedPreRegistration({ testUser, registered: true });
    expect(mockStore.get(path).notifiedAt).toBeNull();
    await seedPreRegistration({ testUser });
    expect(mockStore.has(path)).toBe(false);
  });

  it("cleanup restores live statuses and removes every fixture", async () => {
    await seedPreRegistration({ testUser, scenario: PREREG_SCENARIO.NONE_OPEN, registered: true });
    await cleanupPreRegistrationTestData({ testUser });
    LIVE.forEach((id) => expect(status(id)).toBe("open"));
    const left = [...mockStore.keys()].filter((k) => k.includes("maestro-prereg"));
    expect(left).toEqual([]);
  });
});
