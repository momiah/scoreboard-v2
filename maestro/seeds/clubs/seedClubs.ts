import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { COLLECTION_NAMES, locationSchema, notificationTypes } from "@shared";
import type { Notification } from "@shared";
import type { Club, Player, UserProfile } from "@shared/types";
import { db } from "../../../services/firebase.config";
import { deleteClubAndDetach } from "../../../helpers/clubs/deleteClubAndDetach";
import { sendClubInvite } from "../../../helpers/clubs/sendClubInvite";
import {
  buildFixtureUser,
  deleteFixtureUsers,
  writeFixtureUser,
} from "../../fixtures/fixtureUsers";
import type { LeagueContextType } from "../../../context/types/LeagueContextType";

export const CLUB_NAME_PREFIX = "Maestro";

export const CLUB_FIXTURE_IDS = {
  ownedClub: "maestro-club-owned",
  fixtureClub: "maestro-club-fixture-owned",
} as const;

export const CLUB_FIXTURE_USERS = [
  {
    userId: "maestroClubOwner",
    firstName: "Olive",
    lastName: "Owner",
    username: "maestroOlive",
  },
  {
    userId: "maestroClubMember1",
    firstName: "Ada",
    lastName: "Accepts",
    username: "maestroAda",
  },
  {
    userId: "maestroClubMember2",
    firstName: "Dan",
    lastName: "Declines",
    username: "maestroDan",
  },
  {
    userId: "maestroClubMember3",
    firstName: "Rae",
    lastName: "Requests",
    username: "maestroRae",
  },
  {
    userId: "maestroClubMember4",
    firstName: "Nia",
    lastName: "Noted",
    username: "maestroNia",
  },
  {
    userId: "maestroClubMember5",
    firstName: "Leo",
    lastName: "Leaves",
    username: "maestroLeo",
  },
] as const;

export type ClubFixtureUserId = (typeof CLUB_FIXTURE_USERS)[number]["userId"];

const CLUB_FIXTURE_USER_IDS = CLUB_FIXTURE_USERS.map((user) => user.userId);

export type ClubServices = Pick<
  LeagueContextType,
  | "addClub"
  | "acceptClubInvite"
  | "declineClubInvite"
  | "requestToJoinClub"
  | "acceptClubJoinRequest"
> & {
  sendNotification: (notification: Notification) => Promise<void>;
};

const fixtureUser = (userId: ClubFixtureUserId) =>
  buildFixtureUser(
    CLUB_FIXTURE_USERS.find((user) => user.userId === userId)!,
  ) as UserProfile;

const asPlayer = (user: UserProfile): Player => ({
  userId: user.userId,
  firstName: user.firstName,
  lastName: user.lastName,
  username: user.username,
});

const memberCount = async (clubId: string) =>
  (
    await getCountFromServer(
      collection(db, COLLECTION_NAMES.clubs, clubId, "participants"),
    )
  ).data().count;

const clubExpected = async (clubId: string) => {
  const snap = await getDoc(doc(db, COLLECTION_NAMES.clubs, clubId));
  const club = snap.data() as Club | undefined;
  return {
    clubMembers: await memberCount(clubId),
    clubPendingInvites: club?.pendingInvites?.length ?? 0,
    clubPendingRequests: club?.pendingRequests?.length ?? 0,
  };
};

export const findTestUserClubId = async (testUser: UserProfile) => {
  const snap = await getDocs(
    query(
      collection(db, COLLECTION_NAMES.clubs),
      where("clubOwner.userId", "==", testUser.userId),
    ),
  );
  const newest = snap.docs
    .filter((club) =>
      String(club.data().clubName ?? "").startsWith(CLUB_NAME_PREFIX),
    )
    .sort(
      (a, b) =>
        (b.data().createdAt?.toMillis?.() ?? 0) -
        (a.data().createdAt?.toMillis?.() ?? 0),
    )[0];
  if (!newest) throw new Error("The test user has no Maestro club");
  return newest.id;
};

export const seedClubFixtureUsers = async () => {
  await Promise.all(CLUB_FIXTURE_USERS.map((user) => writeFixtureUser(user)));
  return { users: CLUB_FIXTURE_USER_IDS };
};

const buildClub = ({
  clubId,
  owner,
  clubName,
}: {
  clubId: string;
  owner: UserProfile;
  clubName: string;
}): Club => ({
  clubId,
  clubName,
  clubLocation: {
    city: owner.location.city,
    country: owner.location.country,
    countryCode: owner.location.countryCode,
  },
  countryCode: owner.location.countryCode,
  clubDescription: "",
  clubImage: "",
  clubOwner: {
    userId: owner.userId,
    username: owner.username,
    firstName: owner.firstName,
    lastName: owner.lastName,
    location: owner.location ?? locationSchema,
  },
  clubAdmins: [{ userId: owner.userId, username: owner.username }],
  createdAt: new Date(),
  pendingInvites: [],
  pendingRequests: [],
});

const recreateClub = async (
  services: ClubServices,
  clubId: string,
  owner: UserProfile,
  clubName: string,
) => {
  await deleteClubAndDetach(clubId);
  await services.addClub({
    data: buildClub({ clubId, owner, clubName }),
    ownerParticipant: asPlayer(owner),
  });
};

export const seedOwnedClub = async ({
  services,
  testUser,
  withMembers,
}: {
  services: ClubServices;
  testUser: UserProfile;
  withMembers: ClubFixtureUserId[];
}) => {
  await seedClubFixtureUsers();
  const club = {
    clubId: CLUB_FIXTURE_IDS.ownedClub,
    clubName: `${CLUB_NAME_PREFIX} Seeded Club`,
  };
  const { clubId } = club;
  await recreateClub(services, clubId, testUser, club.clubName);
  for (const userId of withMembers) {
    await inviteAndAccept({ services, inviter: testUser, club, userId });
  }
  return { clubId, expected: await clubExpected(clubId) };
};

export const seedFixtureOwnedClub = async ({
  services,
  withMembers,
}: {
  services: ClubServices;
  withMembers: ClubFixtureUserId[];
}) => {
  await seedClubFixtureUsers();
  const club = {
    clubId: CLUB_FIXTURE_IDS.fixtureClub,
    clubName: `${CLUB_NAME_PREFIX} Olive's Club`,
  };
  const { clubId } = club;
  const owner = fixtureUser("maestroClubOwner");
  await recreateClub(services, clubId, owner, club.clubName);
  for (const userId of withMembers) {
    await inviteAndAccept({ services, inviter: owner, club, userId });
  }
  return { clubId, expected: await clubExpected(clubId) };
};

const findNotificationId = async ({
  recipientId,
  type,
  clubId,
  senderId,
}: {
  recipientId: string;
  type: string;
  clubId: string;
  senderId?: string;
}) => {
  const snap = await getDocs(
    query(
      collection(db, "users", recipientId, "notifications"),
      where("type", "==", type),
      where("data.clubId", "==", clubId),
    ),
  );
  const match = snap.docs.find(
    (notification) =>
      !notification.data().isRead &&
      (!senderId || notification.data().senderId === senderId),
  );
  if (!match) {
    throw new Error(`No unread ${type} for ${recipientId} in ${clubId}`);
  }
  return match.id;
};

const inviteAndAccept = async ({
  services,
  inviter,
  club,
  userId,
}: {
  services: ClubServices;
  inviter: UserProfile;
  club: Pick<Club, "clubId" | "clubName">;
  userId: ClubFixtureUserId;
}) => {
  await sendClubInvite({
    club,
    senderId: inviter.userId,
    recipientId: userId,
    sendNotification: services.sendNotification,
  });
  await services.acceptClubInvite({
    userId,
    clubId: club.clubId,
    notificationId: await findNotificationId({
      recipientId: userId,
      type: notificationTypes.ACTION.INVITE.CLUB,
      clubId: club.clubId,
    }),
  });
};

export const fixtureRespondToInvite = async ({
  services,
  clubId,
  userId,
  accept,
}: {
  services: ClubServices;
  clubId: string;
  userId: ClubFixtureUserId;
  accept: boolean;
}) => {
  const notificationId = await findNotificationId({
    recipientId: userId,
    type: notificationTypes.ACTION.INVITE.CLUB,
    clubId,
  });
  const respond = accept
    ? services.acceptClubInvite
    : services.declineClubInvite;
  await respond({ userId, clubId, notificationId });
  return { clubId, userId, accept, expected: await clubExpected(clubId) };
};

export const fixtureRequestToJoin = async ({
  services,
  clubId,
  userId,
}: {
  services: ClubServices;
  clubId: string;
  userId: ClubFixtureUserId;
}) => {
  const sent = await services.requestToJoinClub({
    clubId,
    currentUser: fixtureUser(userId),
  });
  if (!sent) throw new Error(`${userId} could not request to join ${clubId}`);
  return { clubId, userId, expected: await clubExpected(clubId) };
};

export const fixtureOwnerAcceptsRequest = async ({
  services,
  requester,
}: {
  services: ClubServices;
  requester: UserProfile;
}) => {
  const clubId = CLUB_FIXTURE_IDS.fixtureClub;
  const ownerId = "maestroClubOwner";
  await services.acceptClubJoinRequest({
    senderId: requester.userId,
    clubId,
    userId: ownerId,
    notificationId: await findNotificationId({
      recipientId: ownerId,
      type: notificationTypes.ACTION.JOIN_REQUEST.CLUB,
      clubId,
      senderId: requester.userId,
    }),
  });
  return {
    clubId,
    expected: {
      ...(await clubExpected(clubId)),
      clubJoinedMessage: `${requester.firstName ?? requester.username} joined the club`,
    },
  };
};

export const countRemovalNotices = async (userId: ClubFixtureUserId) => {
  const snap = await getDocs(
    query(
      collection(db, "users", userId, "notifications"),
      where("data.clubId", "==", CLUB_FIXTURE_IDS.ownedClub),
    ),
  );
  const removalNotices = snap.docs.filter((notification) =>
    String(notification.data().message ?? "").startsWith(
      "You have been removed from",
    ),
  ).length;
  return { userId, expected: { clubRemovalNotices: removalNotices } };
};

const deleteTestUserClubNotifications = async (
  testUser: UserProfile,
  clubIds: string[],
) => {
  if (clubIds.length === 0) return 0;
  const snap = await getDocs(
    collection(db, "users", testUser.userId, "notifications"),
  );
  const toDelete = snap.docs.filter((notification) =>
    clubIds.includes(notification.data().data?.clubId),
  );
  await Promise.all(
    toDelete.map((notification) => deleteDoc(notification.ref)),
  );
  return toDelete.length;
};

export const cleanupClubTestData = async ({
  testUser,
}: {
  testUser: UserProfile;
}) => {
  const ownedSnap = await getDocs(
    query(
      collection(db, COLLECTION_NAMES.clubs),
      where("clubOwner.userId", "in", [testUser.userId, "maestroClubOwner"]),
    ),
  );
  const clubIds = ownedSnap.docs
    .filter((club) =>
      String(club.data().clubName ?? "").startsWith(CLUB_NAME_PREFIX),
    )
    .map((club) => club.id);

  for (const clubId of clubIds) {
    const competitions = await Promise.all(
      [COLLECTION_NAMES.leagues, COLLECTION_NAMES.tournaments].map((name) =>
        getDocs(query(collection(db, name), where("clubId", "==", clubId))),
      ),
    );
    const batch = writeBatch(db);
    competitions
      .flatMap((snap) => snap.docs)
      .forEach((competition) => batch.delete(competition.ref));
    await batch.commit();
    await deleteClubAndDetach(clubId);
  }

  const notifications = await deleteTestUserClubNotifications(
    testUser,
    clubIds,
  );
  await deleteFixtureUsers(CLUB_FIXTURE_USER_IDS);
  return { clubs: clubIds, notifications, users: CLUB_FIXTURE_USER_IDS };
};
