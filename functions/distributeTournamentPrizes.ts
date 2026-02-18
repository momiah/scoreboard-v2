import { TeamStats, Tournament } from "./types/competition";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import { calculateTournamentPrizePool } from "./helpers/calculateTournamentPrizePool";
import { ScoreboardProfile } from "./types/player";
import { sendNotification } from "./helpers/sendNotification";
import { notificationTypes } from "./schemas/schema";

const db = admin.firestore();




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

      if (tournament.prizesDistributed || tournament.numberOfGames !== tournament.gamesCompleted) {
        console.log(`[prizes] ${tournamentId} already distributed or not completed`);
        continue;
      }

      const prizePool = calculateTournamentPrizePool(tournament.numberOfGames!, tournament.tournamentType as "Singles" | "Doubles");


      const placementKeys = ["first", "second", "third", "fourth"];
      const placementSuffix = ["st", "nd", "rd", "th"];

      const isDoublesTournament = tournament.tournamentType === "Doubles";
      let prizeWinners: string[][] = [];
      if (isDoublesTournament) {
        const teamsWithWins = tournament.tournamentTeams.filter((t: TeamStats) => t.numberOfWins > 0);
        const sortedTeams = [...teamsWithWins].sort((a, b) => {
          if (b.numberOfWins !== a.numberOfWins) {
            return b.numberOfWins - a.numberOfWins;
          }
          return b.totalPointDifference - a.totalPointDifference;
        });
        const topTeams = sortedTeams.slice(0, 4);
        for (let placementIndex = 0; placementIndex < Math.min(topTeams.length, placementKeys.length); placementIndex++) {
          const team = topTeams[placementIndex];
          const [player1Id, player2Id] = team.teamKey.split("-");
          prizeWinners.push([player1Id, player2Id]);
        }
        console.log("top teams:", topTeams);
      } else {
        const contendersWithWins = tournament.tournamentParticipants.filter((p: ScoreboardProfile) => p.numberOfWins > 0);
        const sortedContenders = [...contendersWithWins].sort((a, b) => {
          if (b.numberOfWins !== a.numberOfWins) {
            return b.numberOfWins - a.numberOfWins;
          }
          return b.totalPointDifference - a.totalPointDifference;
        });
        const topContenders = sortedContenders.slice(0, 4);
        for (let placementIndex = 0; placementIndex < Math.min(topContenders.length, placementKeys.length); placementIndex++) {
          const player = topContenders[placementIndex];
          prizeWinners.push([player.userId!]);

        }
        console.log("top contenders:", topContenders);
      }


      for (let index = 0; index < prizeWinners.length; index++) {

        for (const playerId of prizeWinners[index]) {
          const playerProfile = tournament.tournamentParticipants.find((p: ScoreboardProfile) => p.userId === playerId);
          if (!playerProfile) {
            console.error(`Player profile not found for player ${playerId}`);
            continue;
          }
          const placementKey = placementKeys[index];

          const prizeXP = Math.floor(prizePool * (DISTRIBUTION[index] || 0));
          const userRef = db.collection("users").doc(playerId);

          await userRef.update({
            "profileDetail.XP": admin.firestore.FieldValue.increment(prizeXP),
            [`profileDetail.tournamentStats.${placementKey}`]:
              admin.firestore.FieldValue.increment(1),
          });

          console.log(
            `+${prizeXP} XP -> user ${playerId} (${playerProfile.username}) (${placementKey})`
          );

          const message = `${isDoublesTournament ? `Your team have` : `You have`} placed ${index + 1}${placementSuffix[index]} in ${tournament.tournamentName} and won ${prizeXP} XP!`;

          await sendNotification({
            createdAt: new Date(),
            type: notificationTypes.INFORMATION.TOURNAMENT.TYPE,
            message: message,
            isRead: false,
            senderId: "system",
            recipientId: playerId,
            data: {
              tournamentId: tournamentId,
            },
            response: "",

          });


        }

      }

      await db.collection("tournaments").doc(tournamentId).update({
        prizesDistributed: true,
        prizeDistributionDate: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Prizes distributed for tournament ${tournamentId}`);
    }

    console.log("[prizes] run complete");
  } catch (err) {
    console.error("[prizes] error:", err);
  }
}
);

export { distributeTournamentPrizes };