import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import { COMPETITION_TYPES } from "@shared";
import type { Court, Ladder } from "@shared/types";
import SearchCourt from "../Modals/SearchLocationModal";
import type { CourtDetails, CourtListItem } from "../Modals/SearchLocationModal";
import { LeagueContext } from "../../context/LeagueContext";
import { LadderContext } from "../../context/LadderContext";
import { UserContext } from "../../context/UserContext";
import { PopupContext } from "../../context/PopupContext";
import type { SetLadderHomeCourtOutcome } from "../../context/types/LadderContextType";
import { formatCourtDetailsForList } from "../../helpers/formatCourtDetails";
import { selectableLadderHomeCourts } from "../../helpers/ladderHomeCourt";
import type { LadderHomeCourt } from "../../helpers/ladderHomeCourt";

interface LadderHomeCourtSelectorProps {
  visible: boolean;
  onClose: () => void;
  ladder: Ladder;
  homeCourt: LadderHomeCourt | null;
  saveHomeCourt: (court: Court) => Promise<SetLadderHomeCourtOutcome>;
  onSaved?: () => void;
}

const FAILURE_MESSAGES: Record<string, string> = {
  not_participant: "Join the ladder before choosing a home court.",
  change_limit: "You have already changed your home court for this ladder.",
  invalid_court: "That court is not available in this ladder yet.",
  error: "Something went wrong saving your home court.",
};

const LadderHomeCourtSelector: React.FC<LadderHomeCourtSelectorProps> = ({
  visible,
  onClose,
  ladder,
  homeCourt,
  saveHomeCourt,
  onSaved,
}) => {
  const { getCourts, addCourt } = useContext(LeagueContext);
  const { addCourtToLadder } = useContext(LadderContext);
  const { currentUser } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);

  const [courtsList, setCourtsList] = useState<CourtListItem[]>([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const courtsRef = useRef<Court[]>([]);
  const ladderCourtIdsRef = useRef<string[]>([]);
  const savingRef = useRef(false);

  useEffect(() => {
    ladderCourtIdsRef.current = ladder.courtIds ? [...ladder.courtIds] : [];
  }, [ladder.courtIds]);

  const applyCourts = useCallback((allCourts: Court[]) => {
    const selectable = selectableLadderHomeCourts(
      allCourts,
      ladderCourtIdsRef.current,
    );
    courtsRef.current = selectable;
    setCourtsList(formatCourtDetailsForList(selectable));
  }, []);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setCourtsLoading(true);
    getCourts()
      .then((allCourts: Court[]) => {
        if (active) applyCourts(allCourts);
      })
      .catch((error: unknown) => {
        console.error("Error loading ladder home courts:", error);
        if (active) {
          courtsRef.current = [];
          setCourtsList([]);
        }
      })
      .finally(() => {
        if (active) setCourtsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [visible, getCourts, applyCourts]);

  const handleAddCourt = async (
    courtDetails: CourtDetails,
  ): Promise<string | null> => {
    const payload = {
      ...(courtDetails as Court),
      submittedBy: currentUser?.userId ?? "",
      submittedVia: COMPETITION_TYPES.LADDER,
      verified: false,
    };
    const newCourtId = await addCourt(payload);
    if (newCourtId) {
      ladderCourtIdsRef.current = [...ladderCourtIdsRef.current, newCourtId];
      await addCourtToLadder(ladder.ladderId, newCourtId);
    }
    return newCourtId;
  };

  const handleCourtSubmitted = () => {
    showBottomToast(
      "Court sent for approval. You can select it once it's verified.",
      "info",
    );
  };

  const persist = async (court: Court) => {
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

  const handleSelectCourt = (value: string) => {
    const court = courtsRef.current.find((c) => c.courtName.trim() === value);
    if (!court || court.courtId === homeCourt?.courtId) return;

    const title = homeCourt ? "Change home court?" : "Set home court?";
    const message = homeCourt
      ? `Change your home court to ${court.courtName.trim()}? This is your only change for this ladder.`
      : `Set ${court.courtName.trim()} as your home court? You can change it once for this ladder.`;

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => persist(court) },
    ]);
  };

  return (
    <SearchCourt
      visible={visible}
      onClose={onClose}
      courts={courtsList}
      selectedCourtKey={homeCourt?.courtId}
      onSelectCourt={handleSelectCourt}
      getCourts={getCourts}
      addCourt={handleAddCourt}
      onCourtsRefreshed={applyCourts}
      selectAddedCourt={false}
      showCountryIcon={false}
      loading={courtsLoading}
      onCourtSubmitted={handleCourtSubmitted}
      emptyListMessage="No verified courts in this ladder yet. Add your court below and it will appear here once approved."
    />
  );
};

export default LadderHomeCourtSelector;
