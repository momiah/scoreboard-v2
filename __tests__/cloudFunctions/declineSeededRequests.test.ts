type Doc = Record<string, unknown>;
const store = new Map<string, Doc>();

const docRef = (path: string) => ({
  id: path.split("/").pop()!,
  path,
  get: async () => snap(path),
  update: async (data: Doc) => store.set(path, { ...store.get(path), ...data }),
  collection: (name: string) => collectionRef(`${path}/${name}`),
});

const snap = (path: string) => ({
  id: path.split("/").pop()!,
  ref: docRef(path),
  exists: store.has(path),
  data: () => store.get(path),
  get: (key: string) => store.get(path)?.[key],
});

const collectionRef = (path: string) => ({
  doc: (id: string) => docRef(`${path}/${id}`),
  where: (field: string, _op: "in", values: string[]) => ({
    get: async () => ({
      docs: [...store.keys()]
        .filter(
          (key) =>
            key.startsWith(`${path}/`) &&
            key.split("/").length === path.split("/").length + 1 &&
            values.includes(store.get(key)![field] as string),
        )
        .map(snap),
    }),
  }),
});

const mockDb = {
  doc: (path: string) => docRef(path),
  collection: (name: string) => collectionRef(name),
  runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      get: async (r: { path: string }) => snap(r.path),
      update: (r: { path: string }, data: Doc) =>
        store.set(r.path, { ...store.get(r.path), ...data }),
    }),
};

jest.mock(
  "firebase-admin",
  () => ({ firestore: Object.assign(() => mockDb, {}) }),
  { virtual: true },
);
jest.mock(
  "firebase-functions/v2/scheduler",
  () => ({ onSchedule: (_: string, handler: unknown) => handler }),
  { virtual: true },
);

import {
  declineDueAt,
  declineSeededRequestsNow,
} from "../../functions/src/declineSeededRequests";

const NOW = new Date("2026-11-25T12:00:00Z").getTime();
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000);

beforeEach(() => {
  store.clear();
  store.set("seedRegistry/liveActivity2026", {
    userIds: ["seedOwner", "seedPlayer"],
    leagueIds: ["seededLeague"],
    tournamentIds: [],
  });
  store.set("leagues/seededLeague", {
    pendingRequests: [{ userId: "realUser" }, { userId: "otherReal" }],
  });
  store.set("leagues/realLeague", {
    pendingInvites: [{ userId: "seedPlayer" }, { userId: "someoneElse" }],
  });
});

const addNotification = (path: string, data: Doc, createdAt: Date) =>
  store.set(path, { ...data, createdAt });

it("declines a join request to a seeded league once it is due", async () => {
  addNotification(
    "users/seedOwner/notifications/req1",
    {
      type: "join-league-request",
      senderId: "realUser",
      data: { leagueId: "seededLeague" },
    },
    hoursAgo(12),
  );

  expect(await declineSeededRequestsNow(mockDb as never, NOW)).toEqual({
    declined: 1,
  });
  expect(store.get("leagues/seededLeague")!.pendingRequests).toEqual([
    { userId: "otherReal" },
  ]);
  expect(store.get("users/seedOwner/notifications/req1")).toMatchObject({
    isRead: true,
    response: "declined",
  });
});

it("waits a few hours before declining", async () => {
  const createdAt = hoursAgo(1);
  addNotification(
    "users/seedOwner/notifications/req2",
    {
      type: "join-league-request",
      senderId: "realUser",
      data: { leagueId: "seededLeague" },
    },
    createdAt,
  );
  expect(declineDueAt("req2", createdAt)).toBeGreaterThan(NOW);
  expect(await declineSeededRequestsNow(mockDb as never, NOW)).toEqual({
    declined: 0,
  });
  expect(store.get("leagues/seededLeague")!.pendingRequests).toHaveLength(2);
});

it("declines a real owner's invite to a seeded player", async () => {
  addNotification(
    "users/seedPlayer/notifications/inv1",
    {
      type: "invite-league",
      senderId: "realOwner",
      data: { leagueId: "realLeague" },
    },
    hoursAgo(12),
  );

  expect(await declineSeededRequestsNow(mockDb as never, NOW)).toEqual({
    declined: 1,
  });
  expect(store.get("leagues/realLeague")!.pendingInvites).toEqual([
    { userId: "someoneElse" },
  ]);
});

it("leaves answered notifications and unseeded competitions alone", async () => {
  addNotification(
    "users/seedOwner/notifications/old",
    {
      type: "join-league-request",
      senderId: "realUser",
      response: "accepted",
      data: { leagueId: "seededLeague" },
    },
    hoursAgo(48),
  );
  addNotification(
    "users/seedOwner/notifications/elsewhere",
    {
      type: "join-league-request",
      senderId: "realUser",
      data: { leagueId: "realLeague" },
    },
    hoursAgo(48),
  );

  expect(await declineSeededRequestsNow(mockDb as never, NOW)).toEqual({
    declined: 0,
  });
});

it("does nothing when nothing is seeded", async () => {
  store.delete("seedRegistry/liveActivity2026");
  expect(await declineSeededRequestsNow(mockDb as never, NOW)).toEqual({
    declined: 0,
  });
});
