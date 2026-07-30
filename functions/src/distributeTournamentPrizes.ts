import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
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
import { writeClubCompetitionWon } from "./helpers/clubFeed";
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

type TournamentSideEffects = {
  tournament: Tournament;
  prizeWinners: string[][];
  participantsById: Map<string | undefined, ScoreboardProfile>;
  notifications: ReturnType<typeof buildNotification>[];
};

/**
 * Distribute one tournament's prizes. The completeness check, XP awards and the
 * `prizesDistributed` flip all happen inside a single transaction, so the
 * tournament is atomically "claimed" — a concurrent run (the hourly sweep and
 * the on-update trigger, or two rapid game updates) can't double-pay. XP and
 * the flag commit together; notifications + the club feed event are fanned out
 * afterwards as best-effort side effects.
 *
 * No-ops (returns without side effects) when the tournament is missing, not
 * complete, fixtures aren't generated, or prizes were already distributed.
 */
const distributeForTournament = async (
  db: admin.firestore.Firestore,
  tournamentId: string,
): Promise<void> => {
  const tournamentRef = db.collection("tournaments").doc(tournamentId);

  let sideEffects: TournamentSideEffects | null = null;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(tournamentRef);
    if (!snap.exists) return;

    const tournament = snap.data() as Tournament;

    if (tournament.prizesDistributed) return;
    if (!tournament.fixturesGenerated) return;

    const isKnockout = tournament.tournamentMode === "Knockout";
    const isDoubles = tournament.tournamentType === "Doubles";
    const isComplete = isKnockout
      ? isKnockoutComplete(tournament.fixtures)
      : isRoundRobinComplete(tournament, tournamentId);

    if (!isComplete) return;

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

    const notifications: ReturnType<typeof buildNotification>[] = [];

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

      tx.update(db.collection("users").doc(userId), {
        "profileDetail.XP": admin.firestore.FieldValue.increment(prizeXP),
        [`profileDetail.tournamentStats.${placementKey}`]:
          admin.firestore.FieldValue.increment(1),
      });

      notifications.push(
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

    // Claim + mark distributed in the SAME atomic write as the XP awards.
    tx.update(tournamentRef, {
      prizesDistributed: true,
      prizeDistributionDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    sideEffects = {
      tournament,
      prizeWinners,
      participantsById,
      notifications,
    };
  });

  // `null` means nothing was claimed this run (not ready / already done).
  const effects: TournamentSideEffects | null = sideEffects;
  if (!effects) return;

  await Promise.all(effects.notifications.map((n) => sendNotification(n)));

  // If the tournament belongs to a club, surface the winner in its feed.
  const winnerIds = effects.prizeWinners[0] ?? [];
  if (winnerIds.length > 0) {
    const winnerName = winnerIds
      .map((id) => effects.participantsById.get(id)?.username ?? "A player")
      .join(" / ");
    await writeClubCompetitionWon({
      clubId: (effects.tournament as { clubId?: string | null }).clubId,
      competitionId: tournamentId,
      competitionType: "tournament",
      name: effects.tournament.tournamentName,
      winnerName,
    });
  }

  console.log(`Prizes distributed for tournament ${tournamentId}`);
};

// Hourly safety net: catches any completion the on-update trigger missed
// (manual data edits, dropped events, etc.). Shares distributeForTournament,
// whose atomic claim makes running alongside the trigger safe.
const distributeTournamentPrizes = onSchedule("every 1 hours", async () => {
  const db = admin.firestore();
  try {
    const snap = await db
      .collection("tournaments")
      .where("prizesDistributed", "==", false)
      .get();

    for (const tournamentDoc of snap.docs) {
      await distributeForTournament(db, tournamentDoc.id);
    }

    console.log("[prizes] run complete");
  } catch (err) {
    console.error("[prizes] error:", err);
  }
});

// Instant path: fires the moment a tournament doc changes (e.g. the last game
// is approved and gamesCompleted is incremented), so prizes pay out without
// waiting for the hourly sweep.
const distributeTournamentPrizesOnComplete = onDocumentUpdated(
  "tournaments/{tournamentId}",
  async (event) => {
    const after = event.data?.after.data();
    // Skip if the doc was deleted or prizes are already (being) distributed.
    if (!after || after.prizesDistributed !== false) return;

    const db = admin.firestore();
    try {
      await distributeForTournament(db, event.params.tournamentId);
    } catch (err) {
      console.error(
        `[prizes] on-complete trigger error for ${event.params.tournamentId}:`,
        err,
      );
    }
  },
);

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

export { distributeTournamentPrizes, distributeTournamentPrizesOnComplete };
