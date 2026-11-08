import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  LADDER_PRE_REGISTRANTS_SUBCOLLECTION,
  LADDER_PRE_REGISTRATIONS_COLLECTION,
  LADDER_PRE_REGISTRATION_STATUS,
  LADDER_STATUS,
  ccImageEndpoint,
} from "@shared";
import { deriveLadderDates, formatLadderPrizePool } from "@shared/helpers";
import { db } from "../../../services/firebase.config";
import { getHeadlinePreRegistration } from "../../../helpers/ladderPreRegistrationDisplay";
import {
  deleteFixtureUsers,
  writeFixtureUser,
} from "../../fixtures/fixtureUsers";
import {
  CASH_FIXTURE_KEYS,
  MAESTRO_PREREG_BACKUP_ID,
  MAESTRO_PREREG_LAUNCHED_LADDER_ID,
  MAESTRO_PREREG_LAUNCH_LADDER_ID,
  OPEN_FIXTURE_KEYS,
  PREREG_FIXTURES,
  PREREG_FIXTURE_IDS,
  PREREG_FIXTURE_USER_IDS,
  buildPreRegistrationDoc,
  expectedFor,
  fixtureUserFor,
  flattenExpected,
  isFixturePreRegistrationId,
  registrantUserIds,
} from "./preRegistrationFixtures";

const { OPEN, CLOSED, LAUNCHED } = LADDER_PRE_REGISTRATION_STATUS;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const PREREG_SCENARIO = {
  ALL: "all",
  ONLY_FIXTURES: "only-fixtures",
  COMMUNITY_ONLY: "community-only",
  NONE_OPEN: "none-open",
};

const preRegistrationsRef = () =>
  collection(db, LADDER_PRE_REGISTRATIONS_COLLECTION);
const preRegistrationRef = (id) =>
  doc(db, LADDER_PRE_REGISTRATIONS_COLLECTION, id);
const registrantsRef = (id) =>
  collection(
    db,
    LADDER_PRE_REGISTRATIONS_COLLECTION,
    id,
    LADDER_PRE_REGISTRANTS_SUBCOLLECTION,
  );
const registrantRef = (id, userId) => doc(registrantsRef(id), userId);
const backupRef = () => preRegistrationRef(MAESTRO_PREREG_BACKUP_ID);

/**
 * Closes every open pre-registration that isn't a fixture, after saving each
 * one's status in a hidden backup doc. An existing backup is never
 * overwritten, so closing twice can't record "closed" as the original.
 */
export const closeLivePreRegistrations = async ({ actorUserId }) => {
  const existing = await getDoc(backupRef());
  const saved = existing.exists() ? existing.data().statuses ?? {} : {};
  const open = await getDocs(
    query(preRegistrationsRef(), where("status", "==", OPEN)),
  );
  const live = open.docs.filter(({ id }) => !isFixturePreRegistrationId(id));
  const statuses = { ...saved };
  live.forEach((snap) => {
    if (!(snap.id in statuses)) statuses[snap.id] = snap.data().status;
  });
  await setDoc(backupRef(), {
    status: CLOSED,
    statuses,
    createdBy: actorUserId,
    createdAt: existing.exists() ? existing.data().createdAt : new Date(),
  });
  await Promise.all(
    live.map(({ ref }) => updateDoc(ref, { status: CLOSED })),
  );
  return Object.keys(statuses);
};

/** Puts back the status each live pre-registration had before it was closed, then removes the backup. */
export const restoreLivePreRegistrations = async () => {
  const backup = await getDoc(backupRef());
  if (!backup.exists()) return { restored: [] };
  const statuses = backup.data().statuses ?? {};
  const failures = [];
  for (const [id, status] of Object.entries(statuses)) {
    try {
      await updateDoc(preRegistrationRef(id), { status });
    } catch (error) {
      failures.push(`${id}: ${String(error)}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `CLEANUP INCOMPLETE: live pre-registrations still closed. ${failures.join(" | ")}`,
    );
  }
  const check = await Promise.all(
    Object.entries(statuses).map(async ([id, status]) => {
      const snap = await getDoc(preRegistrationRef(id));
      return snap.exists() && snap.data().status === status ? null : id;
    }),
  );
  const wrong = check.filter(Boolean);
  if (wrong.length > 0) {
    throw new Error(
      `CLEANUP INCOMPLETE: ${wrong.join(", ")} did not get its status back`,
    );
  }
  await deleteDoc(backupRef());
  return { restored: Object.keys(statuses) };
};

const writeRegistrants = async (key, userIds, now) => {
  const { preRegistrationId } = PREREG_FIXTURES[key];
  const launched = PREREG_FIXTURES[key].status === LAUNCHED;
  await Promise.all(
    userIds.map(async (userId, index) => {
      const user = fixtureUserFor(userId);
      await writeFixtureUser(user);
      await setDoc(registrantRef(preRegistrationId, userId), {
        userId,
        username: user.username,
        profileImage: ccImageEndpoint,
        createdAt: new Date(now.getTime() - (index + 1) * 37 * MINUTE_MS),
        notifiedAt: launched ? new Date(now.getTime() - DAY_MS) : null,
      });
    }),
  );
};

const writeLaunchedLadder = (ladderId, key, { actorUserId, registrationOpensAt, now }) => {
  const { preRegistrationId, registrants, status, ...details } =
    PREREG_FIXTURES[key];
  const fixture = buildPreRegistrationDoc(key, { actorUserId, now });
  return setDoc(doc(db, "ladders", ladderId), {
    name: details.name,
    description: fixture.description,
    image: fixture.image,
    region: fixture.region,
    city: details.city,
    countryCode: fixture.countryCode,
    ladderType: details.ladderType,
    genderType: details.genderType,
    courtIds: [],
    registrationOpensAt,
    entryFee: details.entryFee,
    currencyType: fixture.currencyType,
    minRank: null,
    maxPlayers: details.maxPlayers,
    ...deriveLadderDates(registrationOpensAt),
    status: LADDER_STATUS.REGISTRATION_OPEN,
    participantCount: 0,
    prizesDistributed: false,
    createdBy: actorUserId,
    createdAt: now,
    updatedBy: actorUserId,
    updatedAt: now,
  });
};

const removeTestUserRegistrations = (testUser) =>
  Promise.all(
    PREREG_FIXTURE_IDS.map((id) =>
      deleteDoc(registrantRef(id, testUser.userId)),
    ),
  );

const openStatusFor = (key, scenario) => {
  const fixture = PREREG_FIXTURES[key];
  if (!OPEN_FIXTURE_KEYS.includes(key)) return fixture.status;
  if (scenario === PREREG_SCENARIO.NONE_OPEN) return CLOSED;
  if (scenario === PREREG_SCENARIO.COMMUNITY_ONLY && CASH_FIXTURE_KEYS.includes(key)) {
    return CLOSED;
  }
  return OPEN;
};

/**
 * Writes the pre-registration fixtures. `scenario` decides which are open and
 * whether the live pre-registrations are closed so the fixtures alone decide
 * what Home and the Ladders list show; `registered` puts the test user on the
 * cash doubles list the way the app's pre-register does.
 */
export const seedPreRegistration = async ({
  testUser,
  scenario = PREREG_SCENARIO.ALL,
  registered = false,
}) => {
  const now = new Date();
  const actorUserId = testUser.userId;
  const registrants = registrantUserIds();

  if (scenario !== PREREG_SCENARIO.ALL) {
    await closeLivePreRegistrations({ actorUserId });
  }

  const batch = writeBatch(db);
  Object.keys(PREREG_FIXTURES).forEach((key) => {
    batch.set(preRegistrationRef(PREREG_FIXTURES[key].preRegistrationId), {
      ...buildPreRegistrationDoc(key, { actorUserId, now }),
      status: openStatusFor(key, scenario),
    });
  });
  await batch.commit();

  await writeLaunchedLadder(MAESTRO_PREREG_LAUNCHED_LADDER_ID, "launched", {
    actorUserId,
    registrationOpensAt: new Date(now.getTime() - 2 * DAY_MS),
    now,
  });

  await Promise.all(
    Object.entries(registrants).map(async ([key, userIds]) => {
      const existing = await getDocs(
        registrantsRef(PREREG_FIXTURES[key].preRegistrationId),
      );
      await Promise.all(
        existing.docs
          .filter(({ id }) => !userIds.includes(id))
          .map(({ ref }) => deleteDoc(ref)),
      );
      await writeRegistrants(key, userIds, now);
    }),
  );

  await removeTestUserRegistrations(testUser);
  if (registered) {
    await setDoc(
      registrantRef(PREREG_FIXTURES.cashDoubles.preRegistrationId, testUser.userId),
      {
        userId: testUser.userId,
        username: testUser.username ?? "",
        profileImage: testUser.profileImage ?? "",
        createdAt: serverTimestamp(),
        notifiedAt: null,
      },
    );
  }

  const expected = Object.fromEntries(
    OPEN_FIXTURE_KEYS.map((key) => [
      key,
      expectedFor(key, {
        registrantCount:
          registrants[key].length +
          (registered && key === "cashDoubles" ? 1 : 0),
      }),
    ]),
  );
  const open = await getDocs(
    query(preRegistrationsRef(), where("status", "==", OPEN)),
  );
  const headline = getHeadlinePreRegistration(
    open.docs.map((snap) => ({ ...snap.data(), preRegistrationId: snap.id })),
  );

  return {
    scenario,
    registered,
    open: open.size,
    expected: {
      ...flattenExpected(expected),
      "banner-pool": headline ? formatLadderPrizePool(headline) : "",
      "banner-headline": headline?.preRegistrationId ?? "",
      "cash-doubles-registrants-after-join": `${(registrants.cashDoubles.length + 1).toLocaleString("en-GB")} pre-registered`,
      "community-singles-registrants-after-join": "1 pre-registered",
    },
  };
};

/**
 * The website's "Create ladder from this" for the cash singles fixture: a
 * ladder whose registration opened a minute ago, the pre-registration
 * launched and linked to it, and the test user on its list, so the scheduled
 * processLadderPreRegistrationLaunches notifies them on its next run.
 */
export const seedPreRegistrationLaunch = async ({ testUser }) => {
  const now = new Date();
  const actorUserId = testUser.userId;
  const key = "cashSingles";
  const { preRegistrationId } = PREREG_FIXTURES[key];
  await seedPreRegistration({ testUser });
  await setDoc(registrantRef(preRegistrationId, testUser.userId), {
    userId: testUser.userId,
    username: testUser.username ?? "",
    profileImage: testUser.profileImage ?? "",
    createdAt: new Date(now.getTime() - DAY_MS),
    notifiedAt: null,
  });
  await writeLaunchedLadder(MAESTRO_PREREG_LAUNCH_LADDER_ID, key, {
    actorUserId,
    registrationOpensAt: new Date(now.getTime() - MINUTE_MS),
    now,
  });
  await updateDoc(preRegistrationRef(preRegistrationId), {
    status: LAUNCHED,
    ladderId: MAESTRO_PREREG_LAUNCH_LADDER_ID,
    updatedBy: actorUserId,
    updatedAt: now,
  });
  return { preRegistrationId, ladderId: MAESTRO_PREREG_LAUNCH_LADDER_ID };
};

/** Checks the launch job ran for the test user: their registrant was stamped and the notification arrived. */
export const assertPreRegistrationLaunchNotified = async ({ testUser }) => {
  const { preRegistrationId, name } = PREREG_FIXTURES.cashSingles;
  const registrant = await getDoc(registrantRef(preRegistrationId, testUser.userId));
  if (!registrant.exists() || !registrant.data().notifiedAt) {
    throw new Error("The test user's registrant has no notifiedAt yet");
  }
  const notifications = await getDocs(
    query(
      collection(db, "users", testUser.userId, "notifications"),
      where("data.ladderId", "==", MAESTRO_PREREG_LAUNCH_LADDER_ID),
    ),
  );
  const notice = notifications.docs.find(
    (snap) => snap.data().title === "Your ladder is open",
  );
  if (!notice) throw new Error("No 'Your ladder is open' notification");
  if (!String(notice.data().message).startsWith(name)) {
    throw new Error(`Unexpected message: ${notice.data().message}`);
  }
  return { notifiedAt: String(registrant.data().notifiedAt?.toDate?.() ?? ""), notification: notice.id };
};

/** Removes every pre-registration fixture, its registrants and fixture users, both fixture ladders and the launch notification, and restores the live pre-registrations. */
export const cleanupPreRegistrationTestData = async ({ testUser }) => {
  const restore = await restoreLivePreRegistrations();
  let registrants = 0;
  for (const id of PREREG_FIXTURE_IDS) {
    const snap = await getDocs(registrantsRef(id));
    await Promise.all(snap.docs.map(({ ref }) => deleteDoc(ref)));
    registrants += snap.size;
    await deleteDoc(preRegistrationRef(id));
  }
  await Promise.all(
    [MAESTRO_PREREG_LAUNCHED_LADDER_ID, MAESTRO_PREREG_LAUNCH_LADDER_ID].map(
      (id) => deleteDoc(doc(db, "ladders", id)),
    ),
  );
  let notifications = 0;
  if (testUser?.userId) {
    const snap = await getDocs(
      query(
        collection(db, "users", testUser.userId, "notifications"),
        where("data.ladderId", "==", MAESTRO_PREREG_LAUNCH_LADDER_ID),
      ),
    );
    await Promise.all(snap.docs.map(({ ref }) => deleteDoc(ref)));
    notifications = snap.size;
  }
  await deleteFixtureUsers(PREREG_FIXTURE_USER_IDS);
  return {
    ...restore,
    preRegistrations: PREREG_FIXTURE_IDS.length,
    registrants,
    notifications,
    users: PREREG_FIXTURE_USER_IDS.length,
  };
};
