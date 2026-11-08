import {
  collection,
  doc,
  getCountFromServer,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { notificationSchema, notificationTypes } from "@shared";
import type { UserProfile } from "@shared/types";
import { db } from "../../../services/firebase.config";
import { sendClubInvite } from "../../../helpers/clubs/sendClubInvite";
import {
  CLUB_FIXTURE_IDS,
  CLUB_NAME_PREFIX,
  cleanupClubTestData,
  fixtureUser,
  recreateClub,
  seedClubFixtureUsers,
  type ClubServices,
} from "../clubs/seedClubs";

export const INBOX_CLUB_NAME = `${CLUB_NAME_PREFIX} Inbox Club`;
export const INBOX_NEWER_COUNT = 120;
const BATCH_SIZE = 400;

export const inboxNewsMessage = (n: number) =>
  `${INBOX_CLUB_NAME} news ${n}`;

export const seedNotificationInbox = async ({
  services,
  testUser,
}: {
  services: ClubServices;
  testUser: UserProfile;
}) => {
  await cleanupClubTestData({ testUser });
  await seedClubFixtureUsers();
  const owner = fixtureUser("maestroClubOwner");
  const club = { clubId: CLUB_FIXTURE_IDS.inboxClub, clubName: INBOX_CLUB_NAME };
  await recreateClub(services, club.clubId, owner, club.clubName);

  const invited = await sendClubInvite({
    club,
    senderId: owner.userId,
    recipientId: testUser.userId,
    sendNotification: services.sendNotification,
  });
  if (!invited) throw new Error("Club invite to the test user was not sent");

  const inviteSentAt = Date.now();
  const notificationsRef = collection(
    db,
    "users",
    testUser.userId,
    "notifications",
  );
  for (let start = 1; start <= INBOX_NEWER_COUNT; start += BATCH_SIZE) {
    const batch = writeBatch(db);
    const end = Math.min(start + BATCH_SIZE - 1, INBOX_NEWER_COUNT);
    for (let n = start; n <= end; n += 1) {
      batch.set(doc(notificationsRef), {
        ...notificationSchema,
        createdAt: new Date(inviteSentAt + n * 1000),
        recipientId: testUser.userId,
        senderId: owner.userId,
        message: inboxNewsMessage(n),
        type: notificationTypes.INFORMATION.CLUB.TYPE,
        isRead: false,
        data: { clubId: club.clubId },
      });
    }
    await batch.commit();
  }

  const unread = (
    await getCountFromServer(
      query(notificationsRef, where("isRead", "==", false)),
    )
  ).data().count;
  return {
    clubId: club.clubId,
    expected: {
      inboxNewest: inboxNewsMessage(INBOX_NEWER_COUNT),
      inboxUnreadBadge: unread > 99 ? "99+" : String(unread),
    },
  };
};
