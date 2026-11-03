import { doc, runTransaction } from "firebase/firestore";
import type { CollectionName, PendingInvites } from "@shared";
import { db } from "../services/firebase.config";

export const addPendingInvite = async ({
  collectionName,
  documentId,
  userId,
}: {
  collectionName: CollectionName;
  documentId: string;
  userId: string;
}): Promise<boolean> =>
  runTransaction(db, async (transaction) => {
    const ref = doc(db, collectionName, documentId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) return false;

    const pendingInvites: PendingInvites[] = snap.data().pendingInvites || [];
    if (pendingInvites.some((invite) => invite.userId === userId)) {
      return false;
    }

    transaction.update(ref, { pendingInvites: [...pendingInvites, { userId }] });
    return true;
  });
