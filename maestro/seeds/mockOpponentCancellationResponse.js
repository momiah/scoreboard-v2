import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import { LADDER_MATCH_STATUS } from "@shared";

export const mockOpponentCancellationResponse = async ({
  ladderId,
  matchId,
  accept,
}) => {
  const matchRef = doc(db, "ladders", ladderId, "ladderMatches", matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists() || !snap.data().cancellationRequest) {
    throw new Error("mockOpponentCancellationResponse: no pending request");
  }
  await updateDoc(matchRef, {
    cancellationRequest: null,
    lastUpdated: new Date(),
    ...(accept
      ? {
          matchStatus: LADDER_MATCH_STATUS.CANCELLED,
          cancelledAt: new Date(),
          cancelledReason: "Cancelled by agreement",
        }
      : {}),
  });
  return { ladderId, matchId, accept };
};
