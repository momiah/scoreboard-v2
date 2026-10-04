import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import type { Court, Ladder } from "@shared/types";
import { UserContext } from "../context/UserContext";
import { LadderContext } from "../context/LadderContext";
import { PopupContext } from "../context/PopupContext";
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
  confirmHomeCourt: (court: Court | null, onSaved?: () => void) => void;
}

const FAILURE_MESSAGES: Record<string, string> = {
  not_participant: "Join the ladder before choosing a home court.",
  change_limit: "You have already changed your home court for this ladder.",
  invalid_court: "That court is not available in this ladder yet.",
  error: "Something went wrong saving your home court.",
};

export const useLadderHomeCourt = (
  ladder: Pick<Ladder, "ladderId" | "ladderType"> | null | undefined,
): UseLadderHomeCourtResult => {
  const { currentUser } = useContext(UserContext);
  const { subscribeToLadderHomeCourt, setLadderHomeCourt } =
    useContext(LadderContext);
  const { showBottomToast } = useContext(PopupContext);
  const savingRef = useRef(false);

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

  const confirmHomeCourt = useCallback(
    (court: Court | null, onSaved?: () => void) => {
      const currentHomeCourt = state?.homeCourt ?? null;
      if (!court || court.courtId === currentHomeCourt?.courtId) return;

      const courtName = court.courtName.trim();
      const persist = async () => {
        if (savingRef.current) return;
        savingRef.current = true;
        try {
          const { success, reason } = await saveHomeCourt(court);
          if (success) {
            showBottomToast("Home court saved", "success");
            onSaved?.();
          } else {
            showBottomToast(FAILURE_MESSAGES[reason ?? "error"], "error");
          }
        } finally {
          savingRef.current = false;
        }
      };

      Alert.alert(
        currentHomeCourt ? "Change home court?" : "Set home court?",
        currentHomeCourt
          ? `Change your home court to ${courtName}? This is your only change for this ladder.`
          : `Set ${courtName} as your home court? You can change it once for this ladder.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Confirm", onPress: persist },
        ],
      );
    },
    [state?.homeCourt, saveHomeCourt, showBottomToast],
  );

  return {
    homeCourt: state?.homeCourt ?? null,
    hasHomeCourt: hasLadderHomeCourt(state),
    canChange: !!state && canChangeLadderHomeCourt(state),
    isEntrant: !!state,
    loading,
    saveHomeCourt,
    confirmHomeCourt,
  };
};
