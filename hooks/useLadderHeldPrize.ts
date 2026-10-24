import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import {
  LADDER_PRIZE_PAYOUTS_COLLECTION,
  LADDER_PRIZE_PAYOUT_STATUS,
} from "@shared/types";
import type { LadderPrizePayout } from "@shared/types";
import { db } from "../services/firebase.config";

export const useLadderHeldPrize = (
  ladderId: string | undefined,
  userId: string | undefined,
  enabled: boolean,
): LadderPrizePayout | null => {
  const [held, setHeld] = useState<LadderPrizePayout | null>(null);

  useEffect(() => {
    if (!ladderId || !userId || !enabled) {
      setHeld(null);
      return;
    }
    return onSnapshot(
      query(
        collection(db, "ladders", ladderId, LADDER_PRIZE_PAYOUTS_COLLECTION),
        where("userId", "==", userId),
        where("status", "==", LADDER_PRIZE_PAYOUT_STATUS.HELD),
      ),
      (snapshot) => setHeld((snapshot.docs[0]?.data() as LadderPrizePayout) ?? null),
      () => setHeld(null),
    );
  }, [ladderId, userId, enabled]);

  return held;
};
