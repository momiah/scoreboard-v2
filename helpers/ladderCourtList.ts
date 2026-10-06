import {
  isPendingLadderCourtSubmission,
  isSelectableLadderCourt,
} from "@shared/helpers";
import type { Court, Ladder } from "@shared/types";
import type { CourtListItem } from "../components/Modals/SearchLocationModal";
import { formatCourtDetailsForList } from "./formatCourtDetails";

export const buildLadderCourtList = (
  allCourts: Court[],
  ladder: Pick<Ladder, "ladderId" | "courtIds">,
  pinnedSubmitterIds: string[],
): { selectable: Court[]; items: CourtListItem[] } => {
  const selectable = allCourts.filter((court) =>
    isSelectableLadderCourt(court, ladder.courtIds),
  );
  const pending = allCourts.filter((court) =>
    isPendingLadderCourtSubmission(court, ladder.ladderId),
  );
  return {
    selectable,
    items: [
      ...formatCourtDetailsForList(selectable),
      ...formatCourtDetailsForList(pending).map((item, index) => ({
        ...item,
        awaitingVerification: true,
        pinned: pinnedSubmitterIds.includes(
          pending[index].submission?.submittedBy ?? "",
        ),
      })),
    ],
  };
};
