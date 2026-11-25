import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { notificationTypes } from "courtchamps-shared";

// Staff-only registry the app's seedLiveActivity dev function writes.
export const SEED_REGISTRY_PATH = "seedRegistry/liveActivity2026";

const MIN_DELAY_HOURS = 3;
const DELAY_SPREAD_HOURS = 7;

const { INVITE, JOIN_REQUEST } = notificationTypes.ACTION;
const { RESPONSE } = notificationTypes;

const TARGETS: Record<string, { collection: string; idKey: string }> = {
  [INVITE.LEAGUE]: { collection: "leagues", idKey: "leagueId" },
  [INVITE.TOURNAMENT]: { collection: "tournaments", idKey: "tournamentId" },
  [INVITE.CLUB]: { collection: "clubs", idKey: "clubId" },
  [JOIN_REQUEST.LEAGUE]: { collection: "leagues", idKey: "leagueId" },
  [JOIN_REQUEST.TOURNAMENT]: {
    collection: "tournaments",
    idKey: "tournamentId",
  },
};

const hash = (value: string) =>
  [...value].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// A few hours, different per request, like an organiser getting round to it.
export const declineDueAt = (notificationId: string, createdAt: Date) =>
  createdAt.getTime() +
  (MIN_DELAY_HOURS + (hash(notificationId) % DELAY_SPREAD_HOURS)) * 3600_000;

type Notification = {
  type: string;
  senderId?: string;
  recipientId?: string;
  response?: string;
  createdAt?: admin.firestore.Timestamp | Date;
  data?: Record<string, string>;
};

const toDate = (value: Notification["createdAt"]) =>
  typeof (value as { toDate?: unknown })?.toDate === "function"
    ? (value as admin.firestore.Timestamp).toDate()
    : (value as Date | undefined);

// The same two writes as the app's Decline: drop the entry from the
// competition's pending list and mark the notification declined.
const decline = async (
  db: admin.firestore.Firestore,
  notification: admin.firestore.QueryDocumentSnapshot,
  pendingKey: "pendingInvites" | "pendingRequests",
  memberId: string,
) => {
  const data = notification.data() as Notification;
  const target = TARGETS[data.type];
  const competitionId = data.data?.[target.idKey];
  if (competitionId) {
    const ref = db.collection(target.collection).doc(competitionId);
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) return;
      const pending: { userId: string }[] = snap.get(pendingKey) ?? [];
      transaction.update(ref, {
        [pendingKey]: pending.filter((entry) => entry.userId !== memberId),
      });
    });
  }
  await notification.ref.update({ isRead: true, response: RESPONSE.DECLINE });
};

export const declineSeededRequestsNow = async (
  db: admin.firestore.Firestore,
  now = Date.now(),
) => {
  const registry = (await db.doc(SEED_REGISTRY_PATH).get()).data();
  if (!registry) return { declined: 0 };
  const seededCompetitions = new Set<string>([
    ...(registry.leagueIds ?? []),
    ...(registry.tournamentIds ?? []),
  ]);
  const isDue = (snap: admin.firestore.QueryDocumentSnapshot) => {
    const data = snap.data() as Notification;
    const createdAt = toDate(data.createdAt);
    return (
      !data.response && !!createdAt && declineDueAt(snap.id, createdAt) <= now
    );
  };

  let declined = 0;
  for (const userId of registry.userIds ?? []) {
    const inbox = await db
      .collection("users")
      .doc(userId)
      .collection("notifications")
      .where("type", "in", Object.keys(TARGETS))
      .get();
    for (const snap of inbox.docs.filter(isDue)) {
      const data = snap.data() as Notification;
      const isRequest = (Object.values(JOIN_REQUEST) as string[]).includes(
        data.type,
      );
      if (isRequest) {
        const target = TARGETS[data.type];
        if (!seededCompetitions.has(data.data?.[target.idKey] ?? "")) continue;
        if (!data.senderId) continue;
        await decline(db, snap, "pendingRequests", data.senderId);
      } else {
        await decline(db, snap, "pendingInvites", userId);
      }
      declined++;
    }
  }
  return { declined };
};

export const declineSeededRequests = onSchedule("every 1 hours", async () => {
  const { declined } = await declineSeededRequestsNow(admin.firestore());
  if (declined) console.log(`[seeded] declined ${declined} requests`);
});
