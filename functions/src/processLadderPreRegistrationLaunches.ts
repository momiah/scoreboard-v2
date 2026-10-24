import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  getFirestore,
  FieldValue,
  DocumentReference,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import {
  LADDER_PRE_REGISTRANTS_SUBCOLLECTION,
  LADDER_PRE_REGISTRATIONS_COLLECTION,
  LADDER_PRE_REGISTRATION_STATUS,
  ccImageEndpoint,
  isLadderPreRegistrationDue,
  notificationTypes,
} from "courtchamps-shared";
import { sendNotification } from "./helpers/sendNotification";

const MAIL_COLLECTION = "mail";
const LADDERS_COLLECTION = "ladders";
const BATCH_SIZE = 50;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildEmail = (ladderName: string, firstName?: string) => {
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";
  const name = escapeHtml(ladderName);
  return {
    subject: `${ladderName} is open. Claim your place`,
    text: `${greeting}\n\n${ladderName} is now open for registration on Court Champs. You pre-registered, so open the app and join before it fills up.\n\nSee you on the ladder,\nCourt Champs`,
    html: `<div style="font-family:Helvetica,Arial,sans-serif;background:#00152B;color:#ffffff;padding:32px;border-radius:12px;max-width:520px;margin:0 auto">
  <img src="${ccImageEndpoint}" alt="Court Champs" width="56" height="56" style="display:block;margin-bottom:16px" />
  <p style="margin:0 0 12px">${greeting}</p>
  <h1 style="margin:0 0 12px;font-size:22px;color:#FFD700">${name} is now open</h1>
  <p style="margin:0 0 20px;color:#c9d6e3;line-height:1.5">You pre-registered, so you're first to know. Open the Court Champs app and join before the ladder fills up.</p>
  <a href="https://courtchamps.com" style="display:inline-block;background:#00A2FF;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">Join the ladder</a>
  <p style="margin:24px 0 0;color:#8899aa;font-size:12px">You're getting this because you pre-registered for this ladder on Court Champs.</p>
</div>`,
  };
};

const notifyRegistrant = async (
  registrant: QueryDocumentSnapshot,
  ladderId: string,
  ladderName: string,
) => {
  const db = getFirestore();

  const claimed = await db.runTransaction(async (transaction) => {
    const latest = await transaction.get(registrant.ref);
    if (!latest.exists || latest.data()?.notifiedAt) return false;
    transaction.update(registrant.ref, {
      notifiedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
  if (!claimed) return;

  const { userId, email: storedEmail } = registrant.data();

  await sendNotification({
    createdAt: new Date(),
    type: notificationTypes.INFORMATION.LADDER.TYPE,
    title: "Your ladder is open",
    message: `${ladderName} is now open. You pre-registered, so join now to claim your place on the ladder.`,
    isRead: false,
    senderId: "system",
    recipientId: userId,
    data: { ladderId },
    response: "",
  });

  const userDoc = await db.collection("users").doc(userId).get();
  const email =
    storedEmail ||
    (await getAuth()
      .getUser(userId)
      .then((user) => user.email)
      .catch(() => undefined));
  if (!email) {
    console.warn(`No email for pre-registered user ${userId}`);
    return;
  }

  await db.collection(MAIL_COLLECTION).add({
    to: email,
    message: buildEmail(ladderName, userDoc.data()?.firstName),
  });
};

const notifyRegistrants = async (
  preRegistrationRef: DocumentReference,
  ladderId: string,
  ladderName: string,
) => {
  const pending = await preRegistrationRef
    .collection(LADDER_PRE_REGISTRANTS_SUBCOLLECTION)
    .where("notifiedAt", "==", null)
    .get();

  for (let i = 0; i < pending.docs.length; i += BATCH_SIZE) {
    const results = await Promise.allSettled(
      pending.docs
        .slice(i, i + BATCH_SIZE)
        .map((registrant) =>
          notifyRegistrant(registrant, ladderId, ladderName),
        ),
    );
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Failed to notify pre-registrant:", result.reason);
      }
    });
  }
  return pending.size;
};

/**
 * Every 15 minutes, notify the registrants of each launched pre-registration
 * whose ladder has opened for registration, then mark it notified.
 */
export const processLadderPreRegistrationLaunches = onSchedule(
  { schedule: "every 15 minutes", timeoutSeconds: 540 },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const launched = await db
      .collection(LADDER_PRE_REGISTRATIONS_COLLECTION)
      .where("status", "==", LADDER_PRE_REGISTRATION_STATUS.LAUNCHED)
      .where("notifiedAt", "==", null)
      .get();

    for (const preRegistration of launched.docs) {
      const data = preRegistration.data();
      if (!data.ladderId) continue;

      const ladderSnapshot = await db
        .collection(LADDERS_COLLECTION)
        .doc(data.ladderId)
        .get();
      const ladder = ladderSnapshot.data();
      if (!ladder) continue;
      if (
        !isLadderPreRegistrationDue(
          {
            status: data.status,
            ladderId: data.ladderId,
            notifiedAt: data.notifiedAt,
          },
          {
            status: ladder.status,
            registrationOpensAt: ladder.registrationOpensAt,
          },
          now,
        )
      ) {
        continue;
      }

      const notified = await notifyRegistrants(
        preRegistration.ref,
        data.ladderId,
        ladder.name,
      );
      await preRegistration.ref.update({
        notifiedAt: FieldValue.serverTimestamp(),
      });
      console.log(
        `Pre-registration ${preRegistration.id}: notified ${notified} registrant(s) that ladder ${data.ladderId} is open`,
      );
    }
  },
);
