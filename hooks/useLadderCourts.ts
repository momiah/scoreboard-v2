import { useCallback, useContext, useEffect, useRef, useState } from "react";

import { COMPETITION_TYPES, LADDER_TYPE } from "@shared";
import { buildLadderCourtSubmission } from "@shared/helpers";
import type { Court, Ladder } from "@shared/types";
import type {
  CourtDetails,
  CourtListItem,
} from "../components/Modals/SearchLocationModal";
import { LadderContext } from "../context/LadderContext";
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
  ladder: Pick<Ladder, "ladderId" | "ladderType" | "name" | "courtIds">,
  visible: boolean,
): UseLadderCourtsResult => {
  const { getCourts, addCourt } = useContext(LeagueContext);
  const { fetchLadderTeamMemberIds } = useContext(LadderContext);
  const { currentUser } = useContext(UserContext);

  const [courtsList, setCourtsList] = useState<CourtListItem[]>([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const selectableRef = useRef<Court[]>([]);
  const allCourtsRef = useRef<Court[] | null>(null);
  const teamMemberIdsRef = useRef<string[] | null>(null);

  const userId = currentUser?.userId;

  const applyCourts = useCallback(
    (allCourts: Court[]) => {
      allCourtsRef.current = allCourts;
      const { selectable, items } = buildLadderCourtList(
        allCourts,
        { ladderId: ladder.ladderId, courtIds: ladder.courtIds },
        teamMemberIdsRef.current ?? (userId ? [userId] : []),
      );
      selectableRef.current = selectable;
      setCourtsList(items);
    },
    [ladder.courtIds, ladder.ladderId, userId],
  );

  const getCourtsRef = useRef(getCourts);
  getCourtsRef.current = getCourts;
  const applyCourtsRef = useRef(applyCourts);
  applyCourtsRef.current = applyCourts;
  const fetchTeamMemberIdsRef = useRef(fetchLadderTeamMemberIds);
  fetchTeamMemberIdsRef.current = fetchLadderTeamMemberIds;
  const isDoubles = ladder.ladderType === LADDER_TYPE.DOUBLES;
  const ladderId = ladder.ladderId;

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setCourtsLoading(true);
    const teamMemberIds =
      isDoubles && userId
        ? fetchTeamMemberIdsRef.current(ladderId, userId).catch(() => null)
        : Promise.resolve<string[] | null>(null);
    Promise.all([getCourtsRef.current(), teamMemberIds])
      .then(([allCourts, memberIds]) => {
        if (!active) return;
        teamMemberIdsRef.current = memberIds;
        applyCourtsRef.current(allCourts);
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
  }, [visible, isDoubles, ladderId, userId]);

  useEffect(() => {
    if (allCourtsRef.current) applyCourts(allCourtsRef.current);
  }, [applyCourts]);

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
