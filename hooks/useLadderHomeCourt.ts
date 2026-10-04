import { useCallback, useContext, useEffect, useState } from "react";

import type { Court, Ladder } from "@shared/types";
import { UserContext } from "../context/UserContext";
import { LadderContext } from "../context/LadderContext";
import type { SetLadderHomeCourtOutcome } from "../context/types/LadderContextType";
import {
  canChangeLadderHomeCourt,
  hasLadderHomeCourt,
} from "../helpers/ladderHomeCourt";
import type {
  LadderHomeCourt,
  LadderHomeCourtState,
} from "../helpers/ladderHomeCourt";

interface UseLadderHomeCourtResult {
  homeCourt: LadderHomeCourt | null;
  hasHomeCourt: boolean;
  canChange: boolean;
  isEntrant: boolean;
  loading: boolean;
  saveHomeCourt: (court: Court) => Promise<SetLadderHomeCourtOutcome>;
}

export const useLadderHomeCourt = (
  ladder: Pick<Ladder, "ladderId" | "ladderType"> | null | undefined,
): UseLadderHomeCourtResult => {
  const { currentUser } = useContext(UserContext);
  const { subscribeToLadderHomeCourt, setLadderHomeCourt } =
    useContext(LadderContext);

  const userId = currentUser?.userId;
  const ladderId = ladder?.ladderId;
  const ladderType = ladder?.ladderType;

  const [state, setState] = useState<LadderHomeCourtState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ladderId || !ladderType || !userId) {
      setState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeToLadderHomeCourt(
      { ladderId, ladderType },
      userId,
      (next) => {
        setState(next);
        setLoading(false);
      },
      () => {
        setState(null);
        setLoading(false);
      },
    );
  }, [ladderId, ladderType, userId, subscribeToLadderHomeCourt]);

  const saveHomeCourt = useCallback(
    async (court: Court): Promise<SetLadderHomeCourtOutcome> => {
      if (!ladderId || !ladderType || !userId) {
        return { success: false, reason: "not_participant" };
      }
      return setLadderHomeCourt({
        ladder: { ladderId, ladderType },
        userId,
        court,
      });
    },
    [ladderId, ladderType, userId, setLadderHomeCourt],
  );

  return {
    homeCourt: state?.homeCourt ?? null,
    hasHomeCourt: hasLadderHomeCourt(state),
    canChange: !!state && canChangeLadderHomeCourt(state),
    isEntrant: !!state,
    loading,
    saveHomeCourt,
  };
};
