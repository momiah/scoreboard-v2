import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

import {
  calculateTournamentPrizePool,
  getKnockoutTopFour,
  isKnockoutComplete,
} from "@shared/helpers";
import {
  sortPlayersByPlacement,
  sortTeamsByPlacement,
} from "@shared/helpers/getRankInCompetition";
import { ScoreboardProfile, Tournament } from "@shared/types";
import { sendNotification } from "./helpers/sendNotification";
import { notificationTypes } from "@shared";

const DISTRIBUTION = [0.4, 0.3, 0.2, 0.1];
const PLACEMENT_KEYS = ["first", "second", "third", "fourth"] as const;
const PLACEMENT_SUFFIX = ["st", "nd", "rd", "th"] as const;

interface PrizeAllocation {
  userId: string;
  prizeXP: number;
  placementKey: (typeof PLACEMENT_KEYS)[number];
  placementIndex: number;
}

const isRoundRobinComplete = (
  tournament: Tournament,
  tournamentId: string,
): boolean => {
  const { numberOfGames, gamesCompleted } = tournament;
  if (
    typeof numberOfGames !== "number" ||
    typeof gamesCompleted !== "number" ||
    numberOfGames === 0
  ) {
    console.log(
      `[prizes] ${tournamentId} missing game tracking fields (numberOfGames: ${numberOfGames}, gamesCompleted: ${gamesCompleted})`,
    );
    return false;
  }
  if (gamesCompleted < numberOfGames) {
    console.log(
      `[prizes] ${tournamentId} not complete yet (${gamesCompleted}/${numberOfGames})`,
    );
    return false;
  }
  return true;
};

// Returns userIds grouped by placement position. prizeWinners[0] = 1st place,
// prizeWinners[1] = 2nd, etc. Each entry holds 1 userId (singles) or 2 (doubles).
const getPrizeWinnerIds = (tournament: Tournament): string[][] => {
  const isKnockout = tournament.tournamentMode === "Knockout";
  const isDoubles = tournament.tournamentType === "Doubles";

  if (isKnockout) {
    const topFour = getKnockoutTopFour(tournament.fixtures);
    return [
      topFour.first,
      topFour.second,
      topFour.third,
      topFour.fourth,
    ].filter((position): position is string[] => position !== null);
  }

  if (isDoubles) {
    return sortTeamsByPlacement(tournament.tournamentTeams)
      .slice(0, 4)
      .map((team) => team.teamKey.split("-"));
  }

  return sortPlayersByPlacement(tournament.tournamentParticipants)
    .slice(0, 4)
    .map((player) => [player.userId!]);
};

const buildPrizeAllocations = (
  prizeWinners: string[][],
  prizePool: number,
  isDoubles: boolean,
): PrizeAllocation[] => {
  const allocations: PrizeAllocation[] = [];
  prizeWinners.forEach((userIds, placementIndex) => {
    const positionPrize = Math.floor(
      prizePool * (DISTRIBUTION[placementIndex] || 0),
    );
    const prizeXP = isDoubles ? Math.floor(positionPrize / 2) : positionPrize;
    userIds.forEach((userId) => {
      allocations.push({
        userId,
        prizeXP,
        placementKey: PLACEMENT_KEYS[placementIndex],
        placementIndex,
      });
    });
  });
  return allocations;
};

const distributeTournamentPrizes = onSchedule("every 1 hours", async () => {
  const db = admin.firestore();
  try {
    const snap = await db
      .collection("tournaments")
      .where("prizesDistributed", "==", false)
      .get();

    for (const tournamentDoc of snap.docs) {
      const tournament = tournamentDoc.data() as Tournament;
      const tournamentId = tournamentDoc.id;

      if (tournament.prizesDistributed) {
        console.log(`[prizes] ${tournamentId} already distributed`);
        continue;
      }
      if (!tournament.fixturesGenerated) {
        console.log(`[prizes] ${tournamentId} fixtures not generated yet`);
        continue;
      }

      const isKnockout = tournament.tournamentMode === "Knockout";
      const isDoubles = tournament.tournamentType === "Doubles";
      const isComplete = isKnockout
        ? isKnockoutComplete(tournament.fixtures)
        : isRoundRobinComplete(tournament, tournamentId);

      if (!isComplete) {
        if (isKnockout)
          console.log(`[prizes] ${tournamentId} knockout not complete yet`);
        continue;
      }

      const prizePool = calculateTournamentPrizePool(
        tournament.numberOfGames!,
        tournament.tournamentType as "Singles" | "Doubles",
      );

      const prizeWinners = getPrizeWinnerIds(tournament);
      const allocations = buildPrizeAllocations(
        prizeWinners,
        prizePool,
        isDoubles,
      );

      // Build player lookup once — was O(n) per player, now O(1).
      const participantsById = new Map(
        tournament.tournamentParticipants.map((p: ScoreboardProfile) => [
          p.userId,
          p,
        ]),
      );

      // Batch user writes + fan out notifications in parallel.
      const userWritesBatch = db.batch();
      const notificationsToSend: Array<ReturnType<typeof buildNotification>> =
        [];

      for (const {
        userId,
        prizeXP,
        placementKey,
        placementIndex,
      } of allocations) {
        const playerProfile = participantsById.get(userId);
        if (!playerProfile) {
          console.error(`Player profile not found for player ${userId}`);
          continue;
        }

        userWritesBatch.update(db.collection("users").doc(userId), {
          "profileDetail.XP": admin.firestore.FieldValue.increment(prizeXP),
          [`profileDetail.tournamentStats.${placementKey}`]:
            admin.firestore.FieldValue.increment(1),
        });

        notificationsToSend.push(
          buildNotification({
            userId,
            tournamentId,
            tournamentName: tournament.tournamentName,
            prizeXP,
            placementIndex,
            isDoubles,
          }),
        );

        console.log(
          `+${prizeXP} XP -> user ${userId} (${playerProfile.username}) (${placementKey})`,
        );
      }

      userWritesBatch.update(db.collection("tournaments").doc(tournamentId), {
        prizesDistributed: true,
        prizeDistributionDate: admin.firestore.FieldValue.serverTimestamp(),
      });

      await userWritesBatch.commit();
      await Promise.all(notificationsToSend.map((n) => sendNotification(n)));

      console.log(`Prizes distributed for tournament ${tournamentId}`);
    }

    console.log("[prizes] run complete");
  } catch (err) {
    console.error("[prizes] error:", err);
  }
});

const buildNotification = ({
  userId,
  tournamentId,
  tournamentName,
  prizeXP,
  placementIndex,
  isDoubles,
}: {
  userId: string;
  tournamentId: string;
  tournamentName: string;
  prizeXP: number;
  placementIndex: number;
  isDoubles: boolean;
}) => ({
  createdAt: new Date(),
  type: notificationTypes.INFORMATION.TOURNAMENT.TYPE,
  message: `${isDoubles ? "Your team has" : "You have"} placed ${
    placementIndex + 1
  }${PLACEMENT_SUFFIX[placementIndex]} in ${tournamentName} and won ${prizeXP} CP!`,
  isRead: false,
  senderId: "system",
  recipientId: userId,
  data: { tournamentId },
  response: "",
});

export { distributeTournamentPrizes };
