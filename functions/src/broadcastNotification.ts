import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const { sendNotification } = require("./helpers/sendNotification");

export const broadcastNotification = onCall(async (request) => {
  const { payload, testUserId } = request.data;
  if (!payload) throw new HttpsError("invalid-argument", "Payload is required");

  // TEST MODE — single user only
  if (testUserId) {
    await sendNotification({
      ...payload,
      recipientId: testUserId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Test broadcast complete for user: ${testUserId}`);
    return { success: 1, failed: 0, total: 1, mode: "test" };
  }

  // BROADCAST MODE — all users
  const db = admin.firestore();
  const results = { success: 0, failed: 0, total: 0, mode: "broadcast" };
  const BATCH_SIZE = 500;
  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;

  while (true) {
    let q = db.collection("users").limit(BATCH_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snapshot = await q.get();
    if (snapshot.empty) break;

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    results.total += snapshot.docs.length;

    const notificationWrites = snapshot.docs.map((userDoc) =>
      sendNotification({
        ...payload,
        recipientId: userDoc.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
        .then(() => {
          results.success++;
        })
        .catch(() => {
          results.failed++;
        }),
    );

    await Promise.all(notificationWrites);
    if (snapshot.docs.length < BATCH_SIZE) break;
  }

  console.log(`Broadcast complete: ${JSON.stringify(results)}`);
  return results;
});
