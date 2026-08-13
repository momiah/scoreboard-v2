import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import moment from "moment-timezone";

import { calculatePrizeAllocation } from "./helpers/calculatePrizeAllocation";
import { writeClubCompetitionWon } from "./helpers/clubFeed";
import { League, Game } from "courtchamps-shared/types";

interface LeagueParticipant {
  userId?: string;
  username?: string;
  displayName?: string;
  numberOfWins?: number;
  totalPointDifference?: number;
  XP?: number;
}

// 1st place = the same ordering the prize allocation uses (wins → point diff → XP).
const getLeagueWinner = (
  participants: LeagueParticipant[],
): LeagueParticipant | null => {
  if (!participants.length) return null;
  return [...participants].sort(
    (a, b) =>
      (b.numberOfWins ?? 0) - (a.numberOfWins ?? 0) ||
      (b.totalPointDifference ?? 0) - (a.totalPointDifference ?? 0) ||
      (b.XP ?? 0) - (a.XP ?? 0),
  )[0];
};

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

        await calculatePrizeAllocation({
          leagueParticipants: league.leagueParticipants || [],
          prizePool,
          prizeDistribution: DISTRIBUTION,
          leagueId,
          leagueName: league.leagueName,
        });

        // If the league belongs to a club, surface the winner in its feed.
        const winner = getLeagueWinner(
          (league.leagueParticipants || []) as LeagueParticipant[],
        );
        if (winner) {
          await writeClubCompetitionWon({
            clubId: (league as { clubId?: string | null }).clubId,
            competitionId: leagueId,
            competitionType: "league",
            name: league.leagueName,
            winnerName: winner.username ?? winner.displayName ?? "A player",
          });
        }
      }

      console.log("[prizes] run complete");
    } catch (error) {
      console.error("[prizes] error:", error);
    }
  },
);
