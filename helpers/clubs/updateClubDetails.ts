import { doc, updateDoc } from "firebase/firestore";
import { COLLECTION_NAMES } from "@shared";
import type { Club } from "@shared/types";
import { db } from "../../services/firebase.config";

export type ClubDetailsUpdate = Partial<
  Pick<Club, "clubDescription" | "clubImage">
>;

export const updateClubDetails = async (
  clubId: string,
  fields: ClubDetailsUpdate,
): Promise<void> => {
  if (!clubId) throw new Error("updateClubDetails: missing clubId");
  await updateDoc(doc(db, COLLECTION_NAMES.clubs, clubId), fields);
};
