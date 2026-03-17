import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import moment from "moment-timezone";

import { calculatePrizeAllocation } from "./helpers/calculatePrizeAllocation";
import { League } from "./types/competition";
import { Game } from "./types/game";

const TIMEZONE = "Europe/London";
const DISTRIBUTION = [0.4, 0.3, 0.2, 0.1];

const isLeagueDue = (
  endDateStr: string,
  timezone: string = TIMEZONE,
): boolean => {
  const endDate = moment
    .tz(endDateStr, ["DD-MM-YYYY", "DD/MM/YYYY"], timezone)
    .endOf("day");

  if (!endDate.isValid()) return false;

  const now = moment.tz(timezone);
  return now.isSameOrAfter(endDate);
};

const computePrizePool = (league: League): number => {
  const numberOfParticipants = league?.leagueParticipants?.length || 1;
  const games = league?.games || [];
  const numberOfGamesPlayed = games.length || 0;
  const totalGamePointsWon = games.reduce(
    (total: number, game: Game) => total + (game?.result?.winner?.score || 0),
    0,
  );

  return Math.floor(
    (numberOfParticipants * numberOfGamesPlayed + totalGamePointsWon) / 2,
  );
};

export const distributeLeaguePrizes = onSchedule(
  { schedule: "every 1 hours", timeZone: TIMEZONE },
  async () => {
    const db = admin.firestore();
    try {
      const leaguesSnapshot = await db
        .collection("leagues")
        .where("prizesDistributed", "==", false)
        .get();

      for (const doc of leaguesSnapshot.docs) {
        const league = doc.data() as League;
        const leagueId = doc.id;

        if (!isLeagueDue(league.endDate)) {
          console.log(`[prizes] ${leagueId} not due yet`);
          continue;
        }

        const prizePool = computePrizePool(league);

        console.log("league participants:", league.leagueParticipants);
        console.log("prize pool:", prizePool);
        console.log("prize distribution:", DISTRIBUTION);
        console.log(`[prizes] distributing prizes for league ${leagueId}...`);

        await calculatePrizeAllocation({
          leagueParticipants: league.leagueParticipants || [],
          prizePool,
          prizeDistribution: DISTRIBUTION,
          leagueId,
          leagueName: league.leagueName,
        });
      }

      console.log("[prizes] run complete");
    } catch (error) {
      console.error("[prizes] error:", error);
    }
  },
);
