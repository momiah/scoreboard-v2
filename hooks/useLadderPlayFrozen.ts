import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { isLadderMatchPlayFrozen } from "@shared/helpers";
import type { LadderMatch } from "@shared/types";
import { db } from "../services/firebase.config";

export const useLadderPlayFrozen = (
  ladderId: string | undefined,
  matchId?: string,
): boolean => {
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    if (!ladderId) {
      setFrozen(false);
      return;
    }
    let active = true;
    Promise.all([
      getDoc(doc(db, "ladders", ladderId)),
      matchId
        ? getDoc(doc(db, "ladders", ladderId, "ladderMatches", matchId))
        : Promise.resolve(null),
    ])
      .then(([ladderSnap, matchSnap]) => {
        if (!active) return;
        setFrozen(
          isLadderMatchPlayFrozen(
            ladderSnap.data()?.status,
            matchSnap?.data() as LadderMatch | undefined,
          ),
        );
      })
      .catch(() => {
        if (active) setFrozen(false);
      });
    return () => {
      active = false;
    };
  }, [ladderId, matchId]);

  return frozen;
};
