import * as admin from "firebase-admin";

/**
 * Admin-SDK counterpart of the client `clubFeed` helper. Cloud functions run
 * with firebase-admin (a different Firestore handle to the client SDK), so the
 * feed-writing logic is duplicated here rather than imported from the app.
 *
 * Best-effort: a feed write must never fail prize distribution, so errors are
 * swallowed.
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
        type: "competition_won",
        title: "Competition winner",
        message: `${winnerName} won the ${competitionType} "${name}"`,
        icon: "trophy-outline",
        data: { competitionId, competitionType },
        createdAt: new Date(),
      });
  } catch (error) {
    console.error("writeClubCompetitionWon error:", error);
  }
};
