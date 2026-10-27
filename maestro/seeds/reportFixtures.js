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
import { REPORTS_COLLECTION } from "@shared";

export const deleteReportsForLadder = async (ladderId) => {
  const reports = await getDocs(
    query(collection(db, REPORTS_COLLECTION), where("ladderId", "==", ladderId)),
  );
  await Promise.all(reports.docs.map((d) => deleteDoc(d.ref)));
  const counts = await getDocs(collection(db, "ladders", ladderId, "reportCounts"));
  await Promise.all(counts.docs.map((d) => deleteDoc(d.ref)));
};

export const seedStrikes = (ladderId, userId, strikes) =>
  setDoc(doc(db, "ladders", ladderId, "reportCounts", userId), { strikes });
