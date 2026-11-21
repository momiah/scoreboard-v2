import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
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
  clubCompetitionCreatedMessage,
  clubJoinResponseMessage,
  clubLeftMessage,
} from "../../../helpers/clubs/clubNotifications";
import { formatDisplayName } from "../../../helpers/formatDisplayName";
import { createScenarioLeague } from "../leagues/bulkPublish";
import {
  buildFixtureUser,
  deleteFixtureUsers,
  writeFixtureUser,
} from "../../fixtures/fixtureUsers";
import type { LeagueContextType } from "../../../context/types/LeagueContextType";

export const CLUB_NAME_PREFIX = "Maestro";

const SEEDED_CLUB_NAME = `${CLUB_NAME_PREFIX} Seeded Club`;
const OLIVES_CLUB_NAME = `${CLUB_NAME_PREFIX} Olive's Club`;

export const CLUB_FIXTURE_IDS = {
  ownedClub: "maestro-club-owned",
  fixtureClub: "maestro-club-fixture-owned",
  inboxClub: "maestro-club-inbox",
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
  | "declineClubJoinRequest"
  | "addCompetition"
  | "getCourts"
> & {
  sendNotification: (notification: Notification) => Promise<void>;
};

export const fixtureUser = (userId: ClubFixtureUserId) =>
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

export const recreateClub = async (
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
    clubName: SEEDED_CLUB_NAME,
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
    clubName: OLIVES_CLUB_NAME,
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
  userId: string;
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

const noticesWithMessage = async (userId: string, message: string) => {
  const snap = await getDocs(
    query(
      collection(db, "users", userId, "notifications"),
      where("message", "==", message),
    ),
  );
  return snap.size;
};

export const countRequestReplies = async () => {
  const [raeAccepted, niaDeclined] = await Promise.all([
    noticesWithMessage(
      "maestroClubMember3",
      clubJoinResponseMessage(SEEDED_CLUB_NAME, true),
    ),
    noticesWithMessage(
      "maestroClubMember4",
      clubJoinResponseMessage(SEEDED_CLUB_NAME, false),
    ),
  ]);
  return {
    expected: { clubRaeAccepted: raeAccepted, clubNiaDeclined: niaDeclined },
  };
};

export const countLeftNotices = async (testUser: UserProfile) => ({
  expected: {
    clubLeftNotices: await noticesWithMessage(
      "maestroClubOwner",
      clubLeftMessage(formatDisplayName(testUser), OLIVES_CLUB_NAME),
    ),
  },
});

export const CLUB_COMPETITION_NAME = `${CLUB_NAME_PREFIX} Club Cup`;

export const seedCompetitionClub = async ({
  services,
  testUser,
}: {
  services: ClubServices;
  testUser: UserProfile;
}) => {
  const seeded = await seedOwnedClub({
    services,
    testUser,
    withMembers: [
      "maestroClubMember1",
      "maestroClubMember4",
      "maestroClubMember5",
    ],
  });
  const courts = await services.getCourts();
  const court = [...courts].sort((a, b) =>
    a.courtName.trim().localeCompare(b.courtName.trim()),
  )[0];
  if (!court) throw new Error("No courts to play at");
  return {
    ...seeded,
    expected: {
      ...seeded.expected,
      courtName: court.courtName.trim(),
      tournamentName: CLUB_COMPETITION_NAME,
    },
  };
};

export const countCompetitionNotices = async (testUser: UserProfile) => {
  const clubId = await findTestUserClubId(testUser);
  const participants = await getDocs(
    collection(db, COLLECTION_NAMES.clubs, clubId, "participants"),
  );
  const message = clubCompetitionCreatedMessage({
    creatorName: formatDisplayName(testUser),
    competitionType: "tournament",
    name: CLUB_COMPETITION_NAME,
    clubName: SEEDED_CLUB_NAME,
  });
  const counts = await Promise.all(
    participants.docs.map((participant) =>
      noticesWithMessage(participant.id, message),
    ),
  );
  const [ownNotices, adaAdded] = await Promise.all([
    noticesWithMessage(testUser.userId, message),
    noticesWithMessage(
      "maestroClubMember1",
      `You've been added to ${CLUB_COMPETITION_NAME}`,
    ),
  ]);
  return {
    expected: {
      clubCompetitionNotices: counts.reduce((sum, count) => sum + count, 0),
      clubCompetitionOwnNotices: ownNotices,
      clubCompetitionAdaAdded: adaAdded,
    },
  };
};

export const FIXTURE_CLUB_LEAGUE = {
  key: "oliveClub",
  scenario: { name: `${CLUB_NAME_PREFIX} Olive League`, type: "Singles" },
};

export const fixtureOwnerCreatesClubLeague = async (services: ClubServices) => {
  const leagueId = await createScenarioLeague({
    ...FIXTURE_CLUB_LEAGUE,
    owner: fixtureUser("maestroClubOwner"),
    actions: services,
    clubId: CLUB_FIXTURE_IDS.fixtureClub,
  });
  return {
    leagueId,
    expected: { clubLeagueName: FIXTURE_CLUB_LEAGUE.scenario.name },
  };
};

export const fixtureOwnerInvitesTestUser = async ({
  services,
  testUser,
}: {
  services: ClubServices;
  testUser: UserProfile;
}) => {
  const invited = await sendClubInvite({
    club: { clubId: CLUB_FIXTURE_IDS.fixtureClub, clubName: OLIVES_CLUB_NAME },
    senderId: "maestroClubOwner",
    recipientId: testUser.userId,
    sendNotification: services.sendNotification,
  });
  if (!invited) throw new Error("Olive could not invite the test user");
  return {
    expected: {
      clubInviteMessage: `You've been invited to join ${OLIVES_CLUB_NAME}`,
    },
  };
};

export const newestNotificationData = async (testUser: UserProfile) => {
  const snap = await getDocs(
    query(
      collection(db, "users", testUser.userId, "notifications"),
      orderBy("createdAt", "desc"),
      limit(1),
    ),
  );
  const newest = snap.docs[0]?.data();
  if (!newest) throw new Error("The test user has no notifications");
  return { ...(newest.data ?? {}), type: newest.type } as Record<
    string,
    unknown
  >;
};

export const CLUB_TOURNAMENT_SCENARIO = "bulkSingles";

export const seedClubTournament = async ({
  services,
  testUser,
  seedTournament,
}: {
  services: ClubServices;
  testUser: UserProfile;
  seedTournament: (clubId: string) => Promise<unknown>;
}) => {
  const { clubId } = await seedOwnedClub({
    services,
    testUser,
    withMembers: [],
  });
  const club = {
    clubId,
    clubName: SEEDED_CLUB_NAME,
  };
  const outcome = await seedTournament(clubId);
  const tournamentSnap = await getDocs(
    query(
      collection(db, COLLECTION_NAMES.tournaments),
      where("clubId", "==", clubId),
    ),
  );
  const entrantIds = tournamentSnap.docs.flatMap((tournament) =>
    (tournament.data().tournamentParticipants ?? []).map(
      (participant: { userId: string }) => participant.userId,
    ),
  );
  for (const userId of entrantIds.filter((id) => id !== testUser.userId)) {
    await inviteAndAccept({ services, inviter: testUser, club, userId });
  }
  return { clubId, tournament: outcome, expected: await clubExpected(clubId) };
};

export const clubWinnerMessage = async ({
  winnerIds,
  tournamentName,
}: {
  winnerIds: string[];
  tournamentName: string;
}) => {
  const usernames = await Promise.all(
    winnerIds.map(async (userId) => {
      const user = await getDoc(doc(db, "users", userId));
      return (user.data()?.username as string | undefined) ?? "A player";
    }),
  );
  return `${usernames.join(" / ")} won the tournament "${tournamentName}"`;
};

const deleteTestUserClubNotifications = async (
  testUser: UserProfile,
  clubIds: string[],
) => {
  if (clubIds.length === 0) return 0;
  if (clubIds.length > 30)
    throw new Error("More than 30 test clubs to clean up");
  const snap = await getDocs(
    query(
      collection(db, "users", testUser.userId, "notifications"),
      where("data.clubId", "in", clubIds),
    ),
  );
  await Promise.all(
    snap.docs.map((notification) => deleteDoc(notification.ref)),
  );
  return snap.size;
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
    const competitionDocs = competitions.flatMap((snap) => snap.docs);
    for (const competition of competitionDocs) {
      const chat = await getDocs(collection(competition.ref, "chat"));
      await Promise.all(chat.docs.map((message) => deleteDoc(message.ref)));
      await deleteDoc(
        doc(db, "users", testUser.userId, "chats", competition.id),
      );
    }
    const batch = writeBatch(db);
    competitionDocs.forEach((competition) => batch.delete(competition.ref));
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
