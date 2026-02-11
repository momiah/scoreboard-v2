import { Tournament } from "./types/competition";

import { onSchedule } from "firebase-functions/v2/scheduler";
import moment from "moment-timezone";
import * as admin from "firebase-admin";

import { calculateTournamentPrizePool } from "./helpers/calculateTournamentPrizePool";

const db = admin.firestore();

const isTournamentDue = (endDateStr: string, tz = "Europe/London") => {
  const end = moment
    .tz(endDateStr, ["DD-MM-YYYY", "DD/MM/YYYY"], tz)
    .endOf("day");
  if (!end.isValid()) return false;
  const now = moment.tz(tz);
  return now.isSameOrAfter(end);
};



const DISTRIBUTION = [0.4, 0.3, 0.2, 0.1];

const distributeTournamentPrizes = onSchedule("every 1 hours", async () => {
  try {
    const snap = await db
      .collection("tournaments")
      .where("prizesDistributed", "==", false)
      .get();

    for (const doc of snap.docs) {
      const tournament = doc.data() as Tournament;
      const tournamentId = doc.id;

      if (!isTournamentDue(tournament.endDate)) {
        console.log(`[prizes] ${tournamentId} not due yet`);
        continue;
      }

      const prizePool = calculateTournamentPrizePool(tournament.games.length, tournament.tournamentType as "Singles" | "Doubles");

      console.log("tournament participants:", tournament.tournamentParticipants);
      console.log("prize pool:", prizePool);
      console.log("prize distribution:", DISTRIBUTION);
      console.log(`[prizes] distributing prizes for tournament ${tournamentId}...`);

      // await calculatePrizeAllocation({
      //   tournamentParticipants: tournament.tournamentParticipants || [],
      //   prizePool: prizePool,
      //   prizeDistribution: DISTRIBUTION,
      //   leagueId,
      //   leagueName: league.leagueName,
      // });
    }

    console.log("[prizes] run complete");
  } catch (err) {
    console.error("[prizes] error:", err);
  }
}
);

export { distributeTournamentPrizes };