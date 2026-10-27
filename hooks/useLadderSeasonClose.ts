import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import {
  getLadderPostingDeadline,
  getLadderResultsDeadline,
} from "@shared/helpers";
import type { Ladder } from "@shared/types";

import { db } from "../services/firebase.config";
import { toMoment } from "../helpers/ladderPhases";

export interface LadderSeasonClose {
  postingDeadline: Date | null;
  resultsDeadline: Date | null;
  playoffStartsAt: Date | null;
}

export const useLadderSeasonClose = (ladderId?: string): LadderSeasonClose => {
  const [ladder, setLadder] = useState<Pick<Ladder, "playoffStartsAt"> | null>(
    null,
  );

  useEffect(() => {
    if (!ladderId) return;
    let active = true;
    getDoc(doc(db, "ladders", ladderId))
      .then((snapshot) => {
        if (active) setLadder((snapshot.data() as Ladder | undefined) ?? null);
      })
      .catch(() => {
        if (active) setLadder(null);
      });
    return () => {
      active = false;
    };
  }, [ladderId]);

  return {
    postingDeadline: getLadderPostingDeadline(ladder),
    resultsDeadline: getLadderResultsDeadline(ladder),
    playoffStartsAt: toMoment(ladder?.playoffStartsAt)?.toDate() ?? null,
  };
};
