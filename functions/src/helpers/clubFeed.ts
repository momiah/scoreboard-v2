import * as admin from "firebase-admin";
import { buildCompetitionWonEvent } from "courtchamps-shared/helpers";

/**
 * Admin-SDK writer for the club feed; the event itself comes from the shared
 * builder the app uses. Best-effort: a feed write must never fail prize
 * distribution, so errors are swallowed.
 */
export const writeClubCompetitionWon = async ({
  clubId,
  competitionId,
  competitionType,
  name,
  winnerName,
}: {
  clubId?: string | null;
  competitionId: string;
  competitionType: "league" | "tournament";
  name: string;
  winnerName: string;
}): Promise<void> => {
  if (!clubId) return;
  try {
    const db = admin.firestore();
    await db
      .collection("clubs")
      .doc(clubId)
      .collection("feed")
      .doc()
      .set({
        ...buildCompetitionWonEvent({
          name,
          competitionType,
          competitionId,
          winnerName,
        }),
        createdAt: new Date(),
      });
  } catch (error) {
    console.error("writeClubCompetitionWon error:", error);
  }
};
