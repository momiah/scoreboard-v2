const { onSchedule } = require("firebase-functions/v2/scheduler");
const moment = require("moment-timezone");
const admin = require("firebase-admin");

const {
  calculatePrizeAllocation,
} = require("./helpers/calculatePrizeAllocation");

const db = admin.firestore();

const isLeagueDue = (endDateStr, tz = "Europe/London") => {
  const end = moment
    .tz(endDateStr, ["DD-MM-YYYY", "DD/MM/YYYY"], tz)
    .endOf("day");
  if (!end.isValid()) return false;
  const now = moment.tz(tz);
  return now.isSameOrAfter(end);
};

const computePrizePool = (league) => {
  const numberOfParticipants = league?.leagueParticipants?.length || 1;
  const games = league?.games || [];
  const numberOfGamesPlayed = games.length || 0;
  const totalGamePointsWon =
    games.reduce((acc, game) => acc + (game?.result?.winner?.score || 0), 0) ||
    0;

  return Math.floor(
    (numberOfParticipants * numberOfGamesPlayed + totalGamePointsWon) / 2
  );
};

const DISTRIBUTION = [0.4, 0.3, 0.2, 0.1];

exports.distributeLeaguePrizes = onSchedule(
  { schedule: "every 1 hours", timeZone: "Europe/London" },
  async () => {
    try {
      const snap = await db
        .collection("leagues")
        .where("prizesDistributed", "==", false)
        .get();

      for (const doc of snap.docs) {
        const league = doc.data() || {};
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
          prizePool: prizePool,
          prizeDistribution: DISTRIBUTION,
          leagueId,
        });
      }

      console.log("[prizes] run complete");
    } catch (err) {
      console.error("[prizes] error:", err);
    }
    return null;
  }
);
