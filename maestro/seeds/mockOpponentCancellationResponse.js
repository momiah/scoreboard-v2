import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  LADDER_MATCH_STATUS,
  notificationSchema,
  notificationTypes,
} from "@shared";
import { formatDisplayName } from "../../helpers/formatDisplayName";

export const mockOpponentCancellationResponse = async ({
  ladderId,
  matchId,
  accept,
  responder = /** @type {any} */ (undefined),
  notifyUserId = /** @type {string | undefined} */ (undefined),
}) => {
  const matchRef = doc(db, "ladders", ladderId, "ladderMatches", matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists() || !snap.data().cancellationRequest) {
    throw new Error("mockOpponentCancellationResponse: no pending request");
  }
  const courtName = snap.data().court?.courtName ?? "your court";
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
  if (notifyUserId && responder) {
    await setDoc(
      doc(
        collection(db, "users", notifyUserId, "notifications"),
        `maestro-cancel-response-${matchId}`,
      ),
      {
        ...notificationSchema,
        createdAt: new Date(),
        recipientId: notifyUserId,
        senderId: responder.userId,
        message: accept
          ? `${formatDisplayName(responder)} agreed to cancel your ladder match at ${courtName}`
          : `${formatDisplayName(responder)} declined to cancel your ladder match at ${courtName}. The match goes ahead.`,
        type: notificationTypes.INFORMATION.LADDER.TYPE,
        data: { ladderId, matchId, tab: "Schedule" },
      },
    );
  }
  return { ladderId, matchId, accept };
};
