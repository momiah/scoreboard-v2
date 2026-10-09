import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import { addLadderMatchCheckIn } from "@shared/helpers";

export const mockOpponentCheckIn = async ({ ladderId, matchId, userIds }) => {
  const matchRef = doc(db, "ladders", ladderId, "ladderMatches", matchId);
  const snap = await getDoc(matchRef);
  if (!snap.exists()) throw new Error("mockOpponentCheckIn: match not found");
  const match = snap.data();
  let checkIn = match.checkIn;
  userIds.forEach((userId) => {
    checkIn = addLadderMatchCheckIn(
      { participants: match.participants, checkIn },
      userId,
    );
  });
  await updateDoc(matchRef, { checkIn });
  return { checkedIn: userIds };
};
