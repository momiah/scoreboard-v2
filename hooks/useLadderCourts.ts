import { useCallback, useContext, useEffect, useRef, useState } from "react";

import { COMPETITION_TYPES } from "@shared";
import { buildLadderCourtSubmission } from "@shared/helpers";
import type { Court, Ladder } from "@shared/types";
import type {
  CourtDetails,
  CourtListItem,
} from "../components/Modals/SearchLocationModal";
import { LeagueContext } from "../context/LeagueContext";
import { UserContext } from "../context/UserContext";
import { buildLadderCourtList } from "../helpers/ladderCourtList";

export const COURT_SUBMITTED_MESSAGE =
  "Court sent for approval. You'll be notified once it's verified.";

interface UseLadderCourtsResult {
  courtsList: CourtListItem[];
  courtsLoading: boolean;
  findSelectableCourt: (courtName: string) => Court | null;
  submitCourt: (courtDetails: CourtDetails) => Promise<string | null>;
  applyCourts: (allCourts: Court[]) => void;
  getCourts: () => Promise<Court[]>;
}

export const useLadderCourts = (
  ladder: Pick<Ladder, "ladderId" | "name" | "courtIds">,
  visible: boolean,
): UseLadderCourtsResult => {
  const { getCourts, addCourt } = useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);

  const [courtsList, setCourtsList] = useState<CourtListItem[]>([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const selectableRef = useRef<Court[]>([]);

  const userId = currentUser?.userId;

  const applyCourts = useCallback(
    (allCourts: Court[]) => {
      const { selectable, items } = buildLadderCourtList(
        allCourts,
        { ladderId: ladder.ladderId, courtIds: ladder.courtIds },
        userId,
      );
      selectableRef.current = selectable;
      setCourtsList(items);
    },
    [ladder.courtIds, ladder.ladderId, userId],
  );

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setCourtsLoading(true);
    getCourts()
      .then((allCourts: Court[]) => {
        if (active) applyCourts(allCourts);
      })
      .catch((error: unknown) => {
        console.error("Error loading ladder courts:", error);
        if (active) {
          selectableRef.current = [];
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

  const findSelectableCourt = useCallback(
    (courtName: string): Court | null =>
      selectableRef.current.find((c) => c.courtName.trim() === courtName) ??
      null,
    [],
  );

  const submitCourt = useCallback(
    async (courtDetails: CourtDetails): Promise<string | null> => {
      const newCourtId = await addCourt({
        ...(courtDetails as Court),
        submittedBy: userId ?? "",
        submittedVia: COMPETITION_TYPES.LADDER,
        verified: false,
        submission: buildLadderCourtSubmission({
          submittedBy: userId ?? "",
          submittedByUsername: currentUser?.username ?? "",
          ladderId: ladder.ladderId,
          ladderName: ladder.name,
        }),
      });
      return newCourtId;
    },
    [addCourt, userId, currentUser?.username, ladder.ladderId, ladder.name],
  );

  return {
    courtsList,
    courtsLoading,
    findSelectableCourt,
    submitCourt,
    applyCourts,
    getCourts,
  };
};
