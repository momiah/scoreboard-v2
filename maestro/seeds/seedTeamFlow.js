import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  LADDER_STATUS,
  LADDER_TYPE,
  TEAM_STATUS,
  notificationSchema,
  notificationTypes,
} from "@shared";
import { buildSeedLadderTeam } from "./buildSeedLadderTeam";
import { seedFixtureUser } from "./homeCourtFixtures";
import {
  MAESTRO_CREATED_TEAM_NAME,
  deleteAllMaestroFixtureTeams,
} from "./teamFixtures";

export const MAESTRO_TEAM_LADDER_ID = "maestro-team-ladder";
export const MAESTRO_TEAM_LADDER_NAME = "Maestro Team Ladder";
export const MAESTRO_TEAM_INVITEE_ID = "maestro-team-invitee";
export const MAESTRO_TEAM_INVITER_ID = "maestro-team-inviter";
export const MAESTRO_TEAM_OWNER_ID = "maestro-team-owner";
export const MAESTRO_TEAM_REQUESTER_ID = "maestro-team-requester";
export const MAESTRO_TEAM_FIXTURE_USER_IDS = [
  MAESTRO_TEAM_INVITEE_ID,
  MAESTRO_TEAM_INVITER_ID,
  MAESTRO_TEAM_OWNER_ID,
  MAESTRO_TEAM_REQUESTER_ID,
];
export { MAESTRO_CREATED_TEAM_NAME };

const FIXTURE_TAG = "teams-flow";
const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days) => new Date(Date.now() + days * DAY_MS);

export const TEAM_VARIANT = {
  CREATE: "create",
  INVITED: "invited",
  REQUEST_OUT: "requestOut",
  REQUEST_IN: "requestIn",
};

const fixture = (userId, lastName) => ({
  userId,
  firstName: "Maestro",
  lastName,
  username: `maestro_team_${lastName.toLowerCase()}`,
});
const invitee = fixture(MAESTRO_TEAM_INVITEE_ID, "Invitee");
const inviter = fixture(MAESTRO_TEAM_INVITER_ID, "Inviter");
const owner = fixture(MAESTRO_TEAM_OWNER_ID, "Owner");
const requester = fixture(MAESTRO_TEAM_REQUESTER_ID, "Requester");

const deleteAllDocs = async (colRef) => {
  const snap = await getDocs(colRef);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
};


const clearNotifications = async (userId) => {
  const snap = await getDocs(collection(db, "users", userId, "notifications"));
  await Promise.all(
    snap.docs
      .filter((d) => String(d.id).startsWith("maestro-team-") || d.data().senderId?.startsWith?.("maestro-team-") || d.data().data?.ladderId === MAESTRO_TEAM_LADDER_ID)
      .map((d) => deleteDoc(d.ref)),
  );
};

const notification = (id, userId, body) => ({
  id,
  userId,
  data: {
    ...notificationSchema,
    createdAt: new Date(),
    recipientId: userId,
    ...body,
  },
});

export const seedTeamFlow = async ({
  testUser,
  variant = TEAM_VARIANT.CREATE,
}) => {
  if (!testUser?.userId) {
    throw new Error("seedTeamFlow: testUser with a userId is required");
  }
  await Promise.all([
    seedFixtureUser(invitee, "maestro-team-invitee@example.com"),
    seedFixtureUser(inviter, "maestro-team-inviter@example.com"),
    seedFixtureUser(owner, "maestro-team-owner@example.com"),
    seedFixtureUser(requester, "maestro-team-requester@example.com"),
  ]);
  await Promise.all(
    ["ladderMatches", "ladderParticipants", "ladderTeams", "ladderMembers"].map(
      (sub) => deleteAllDocs(collection(db, "ladders", MAESTRO_TEAM_LADDER_ID, sub)),
    ),
  );
  await deleteAllMaestroFixtureTeams();
  await Promise.all(
    [testUser.userId, ...MAESTRO_TEAM_FIXTURE_USER_IDS].map(clearNotifications),
  );

  await setDoc(doc(db, "ladders", MAESTRO_TEAM_LADDER_ID), {
    ladderId: MAESTRO_TEAM_LADDER_ID,
    name: MAESTRO_TEAM_LADDER_NAME,
    description:
      "Seeded by maestro/seeds/seedTeamFlow for Maestro E2E tests. Safe to ignore.",
    image: "",
    region: "Test",
    countryCode: "GB",
    ladderType: LADDER_TYPE.DOUBLES,
    genderType: "Mixed",
    courtIds: [],
    status: LADDER_STATUS.REGISTRATION_OPEN,
    registrationOpensAt: daysFromNow(-5),
    registrationClosesAt: daysFromNow(7),
    seasonStartsAt: daysFromNow(-5),
    seasonEndsAt: daysFromNow(60),
    playoffStartsAt: daysFromNow(50),
    playoffEndsAt: daysFromNow(60),
    entryFee: 0,
    currencyType: "GBP",
    minRank: 0,
    maxPlayers: 2048,
    participantCount: 1,
    prizesDistributed: false,
    createdBy: testUser.userId,
    createdAt: new Date(),
    updatedBy: testUser.userId,
    updatedAt: new Date(),
  });

  const base = {
    type: notificationTypes.INFORMATION.LADDER.TYPE,
    senderId: "system",
  };
  const entries = ["Summary", "Performance"].map((tab) =>
    notification(`maestro-team-open-${tab}`, testUser.userId, {
      ...base,
      message: `Maestro: open ${MAESTRO_TEAM_LADDER_NAME} on ${tab}`,
      data: { ladderId: MAESTRO_TEAM_LADDER_ID, tab },
    }),
  );

  if (variant === TEAM_VARIANT.INVITED) {
    const team = {
      ...buildSeedLadderTeam({
        players: [inviter, testUser],
        createdBy: inviter,
        teamName: "Maestro Invited Team",
      }),
      status: TEAM_STATUS.PENDING,
      maestroFixture: FIXTURE_TAG,
    };
    await setDoc(doc(db, "teams", team.teamId), team);
    entries.push(
      notification("maestro-team-invite", testUser.userId, {
        type: notificationTypes.ACTION.INVITE.TEAM,
        senderId: inviter.userId,
        message: "Maestro Inviter invited you to form a doubles team",
        data: { teamId: team.teamId },
      }),
    );
  }

  if (variant === TEAM_VARIANT.REQUEST_OUT) {
    const team = {
      ...buildSeedLadderTeam({
        players: [owner],
        createdBy: owner,
        teamName: "Maestro Open Team",
      }),
      status: TEAM_STATUS.PENDING,
      maestroFixture: FIXTURE_TAG,
    };
    await setDoc(doc(db, "teams", team.teamId), team);
    await setDoc(
      doc(db, "ladders", MAESTRO_TEAM_LADDER_ID, "ladderTeams", team.teamKey),
      { ...team, numberOfWins: 1, numberOfGamesPlayed: 1, XP: 20 },
    );
  }

  if (variant === TEAM_VARIANT.REQUEST_IN) {
    const team = {
      ...buildSeedLadderTeam({
        players: [testUser],
        createdBy: testUser,
        teamName: "Maestro Request Team",
      }),
      status: TEAM_STATUS.PENDING,
      maestroFixture: FIXTURE_TAG,
    };
    await setDoc(doc(db, "teams", team.teamId), team);
    await setDoc(doc(db, "teams", team.teamId, "requests", requester.userId), {
      userId: requester.userId,
      username: requester.username,
      firstName: requester.firstName,
      lastName: requester.lastName,
      displayName: "Maestro Requester",
      createdAt: new Date(),
    });
    entries.push(
      notification("maestro-team-join-request", testUser.userId, {
        type: notificationTypes.ACTION.JOIN_REQUEST.TEAM,
        senderId: requester.userId,
        message: "Maestro Requester wants to join your team",
        data: { teamId: team.teamId },
      }),
    );
  }

  await Promise.all(
    entries.map(({ id, userId, data }) =>
      setDoc(doc(db, "users", userId, "notifications", id), data),
    ),
  );
  return { ladderId: MAESTRO_TEAM_LADDER_ID, variant };
};

export const cleanupTeamFlowTestData = async () => {
  await Promise.all(
    ["ladderMatches", "ladderParticipants", "ladderTeams", "ladderMembers"].map(
      (sub) => deleteAllDocs(collection(db, "ladders", MAESTRO_TEAM_LADDER_ID, sub)),
    ),
  );
  await deleteDoc(doc(db, "ladders", MAESTRO_TEAM_LADDER_ID));
  await deleteAllMaestroFixtureTeams();
  await Promise.all(
    MAESTRO_TEAM_FIXTURE_USER_IDS.map(async (id) => {
      await clearNotifications(id);
      await deleteDoc(doc(db, "users", id));
    }),
  );
  return { ladders: [MAESTRO_TEAM_LADDER_ID] };
};
