import { onDocumentWritten } from "firebase-functions/v2/firestore";
import {
  getFirestore,
  FieldValue,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import {
  LADDER_STATUS,
  LADDER_PRE_REGISTRATION_COLLECTION,
  ccImageEndpoint,
  getLadderPreRegistrationKeyForLadder,
  notificationTypes,
} from "courtchamps-shared";
import type { Ladder } from "courtchamps-shared";
import { sendNotification } from "./helpers/sendNotification";

const MAIL_COLLECTION = "mail";
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

const notifyRegistration = async (
  registration: QueryDocumentSnapshot,
  ladderId: string,
  ladderName: string,
) => {
  const db = getFirestore();

  const claimed = await db.runTransaction(async (transaction) => {
    const latest = await transaction.get(registration.ref);
    if (!latest.exists || latest.data()?.notifiedAt) return false;
    transaction.update(registration.ref, {
      notifiedAt: FieldValue.serverTimestamp(),
      ladderId,
    });
    return true;
  });
  if (!claimed) return;

  const { userId } = registration.data();

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

  const [authUser, userDoc] = await Promise.all([
    getAuth()
      .getUser(userId)
      .catch(() => null),
    db.collection("users").doc(userId).get(),
  ]);
  const email = authUser?.email;
  if (!email) {
    console.warn(`No email for pre-registered user ${userId}`);
    return;
  }

  await db.collection(MAIL_COLLECTION).add({
    to: email,
    message: buildEmail(ladderName, userDoc.data()?.firstName),
  });
};

export const notifyLadderPreRegistrations = onDocumentWritten(
  { document: "ladders/{ladderId}", timeoutSeconds: 540 },
  async (event) => {
    const before = event.data?.before.data() as Ladder | undefined;
    const after = event.data?.after.data() as Ladder | undefined;
    if (
      !after ||
      after.status !== LADDER_STATUS.REGISTRATION_OPEN ||
      before?.status === LADDER_STATUS.REGISTRATION_OPEN
    ) {
      return;
    }

    const ladderKey = getLadderPreRegistrationKeyForLadder(after);
    if (!ladderKey) return;

    const { ladderId } = event.params;
    const pending = await getFirestore()
      .collection(LADDER_PRE_REGISTRATION_COLLECTION)
      .where("ladderKey", "==", ladderKey)
      .where("notifiedAt", "==", null)
      .get();

    console.log(
      `Notifying ${pending.size} pre-registrations (${ladderKey}) that ladder ${ladderId} is open`,
    );

    for (let i = 0; i < pending.docs.length; i += BATCH_SIZE) {
      const results = await Promise.allSettled(
        pending.docs
          .slice(i, i + BATCH_SIZE)
          .map((registration) =>
            notifyRegistration(registration, ladderId, after.name),
          ),
      );
      results.forEach((result) => {
        if (result.status === "rejected") {
          console.error("Failed to notify pre-registration:", result.reason);
        }
      });
    }
  },
);
