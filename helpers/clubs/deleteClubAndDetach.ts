import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
  type WriteBatch,
} from "firebase/firestore";
import { COLLECTION_NAMES } from "@shared";
import { db } from "../../services/firebase.config";

const BATCH_LIMIT = 450;

const commitInChunks = async (
  docs: QueryDocumentSnapshot[],
  apply: (batch: WriteBatch, docSnap: QueryDocumentSnapshot) => void,
) => {
  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    docs.slice(i, i + BATCH_LIMIT).forEach((docSnap) => apply(batch, docSnap));
    await batch.commit();
  }
};

export const deleteClubAndDetach = async (clubId: string): Promise<void> => {
  if (!clubId) throw new Error("deleteClubAndDetach: missing clubId");

  for (const collectionName of [
    COLLECTION_NAMES.leagues,
    COLLECTION_NAMES.tournaments,
  ]) {
    const snap = await getDocs(
      query(collection(db, collectionName), where("clubId", "==", clubId)),
    );
    await commitInChunks(snap.docs, (batch, docSnap) =>
      batch.update(docSnap.ref, { clubId: null }),
    );
  }

  for (const sub of ["participants", "feed", "chat"]) {
    const snap = await getDocs(
      collection(db, COLLECTION_NAMES.clubs, clubId, sub),
    );
    await commitInChunks(snap.docs, (batch, docSnap) =>
      batch.delete(docSnap.ref),
    );
  }

  await deleteDoc(doc(db, COLLECTION_NAMES.clubs, clubId));
};
