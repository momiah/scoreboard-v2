import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase.config";
import {
  LADDER_PRIZE_PAYOUTS_COLLECTION,
  LADDER_PRIZE_PAYOUT_STATUS,
} from "@shared";
import { getLadderPlacePrize } from "@shared/helpers";
import { maestroPlayoffPayoutStructure } from "./seedLadderPlayoffs";

const NO_PRIZE = { cash: 0, cp: 0 };

/**
 * After the test user loses their Quarter-Final, finishes the playoffs as
 * completeAndPayLadder does for a disqualified player: their Joint 5th prize
 * is held for review and the ladder is marked paid.
 */
export const mockLadderHeldPrize = async ({
  testUser,
  ladderId,
  entryFee,
  size,
  tieId,
  place,
}) => {
  const prize = getLadderPlacePrize(
    {
      entryFee,
      participantCount: size,
      maxPlayers: size,
      payoutStructure: maestroPlayoffPayoutStructure(entryFee),
    },
    place,
  );
  const now = new Date();
  const payoutId = `${tieId}-${testUser.userId}`;
  await setDoc(doc(db, "ladders", ladderId, LADDER_PRIZE_PAYOUTS_COLLECTION, payoutId), {
    payoutId,
    ladderId,
    userId: testUser.userId,
    sidePlayerIds: [testUser.userId],
    tieId,
    place,
    voided: false,
    currencyType: "GBP",
    placePrize: prize,
    potShare: NO_PRIZE,
    prize,
    paid: NO_PRIZE,
    status: LADDER_PRIZE_PAYOUT_STATUS.HELD,
    reason: "Disqualified: 3 cheating offences",
    review: null,
    createdAt: now,
    updatedAt: now,
  });
  await updateDoc(doc(db, "ladders", ladderId), { prizesDistributed: true });
  return { payoutId, prize };
};
