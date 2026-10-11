import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { randomInt } from "crypto";

import {
  LADDER_PLAYOFF_TIE_STATUS,
  LADDER_PLAYOFF_TIES_COLLECTION,
} from "courtchamps-shared/types";
import type {
  Ladder,
  LadderPlayoffCoinToss,
  LadderPlayoffTie,
} from "courtchamps-shared/types";
import { flipLadderPlayoffCoin as flipCoin } from "courtchamps-shared/helpers";

import { notifyLadderPlayers } from "./helpers/notifyLadderPlayers";
import { ladderPlayoffTeamName } from "./helpers/ladderPlayoffTies";

const RANDOM_RANGE = 1_000_000;

export interface FlipLadderPlayoffCoinData {
  ladderId: string;
  tieId: string;
}

export interface FlipLadderPlayoffCoinResult {
  firstHost: LadderPlayoffCoinToss["firstHost"];
  flippedBy: string;
  flippedAt: string;
  alreadyFlipped: boolean;
}

/**
 * Flips the coin for a scheduled tie: any player in the tie can flip, the
 * result is drawn on the server and saved once. A second flip returns the
 * saved result. The opposing side is told who hosts the first match.
 */
export const runFlipLadderPlayoffCoin = async ({
  userId,
  data,
  now = new Date(),
  random = () => randomInt(0, RANDOM_RANGE) / RANDOM_RANGE,
}: {
  userId: string | undefined;
  data: Partial<FlipLadderPlayoffCoinData> | undefined;
  now?: Date;
  random?: () => number;
}): Promise<FlipLadderPlayoffCoinResult> => {
  if (!userId) {
    throw new HttpsError("unauthenticated", "Sign in to flip the coin.");
  }
  const ladderId = data?.ladderId;
  const tieId = data?.tieId;
  if (!ladderId || !tieId) {
    throw new HttpsError("invalid-argument", "ladderId and tieId are required.");
  }

  const db = admin.firestore();
  const ladderRef = db.collection("ladders").doc(ladderId);
  const tieRef = ladderRef.collection(LADDER_PLAYOFF_TIES_COLLECTION).doc(tieId);

  const { toss, alreadyFlipped, tie } = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(tieRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "This playoff game doesn't exist.");
    }
    const current = snapshot.data() as LadderPlayoffTie;
    const inTie = [
      ...(current.side1?.playerIds ?? []),
      ...(current.side2?.playerIds ?? []),
    ].includes(userId);
    if (!inTie) {
      throw new HttpsError("permission-denied", "Only players in this game can flip.");
    }
    if (current.coinToss) {
      return { toss: current.coinToss, alreadyFlipped: true, tie: current };
    }
    if (current.status !== LADDER_PLAYOFF_TIE_STATUS.SCHEDULED) {
      throw new HttpsError("failed-precondition", "This playoff game isn't open.");
    }
    const flipped = flipCoin({ random, userId, now });
    transaction.update(tieRef, { coinToss: flipped });
    return { toss: flipped, alreadyFlipped: false, tie: current };
  });

  if (!alreadyFlipped) {
    const flipperSide = tie.side1?.playerIds.includes(userId) ? "team1" : "team2";
    const opponentIds =
      (flipperSide === "team1" ? tie.side2?.playerIds : tie.side1?.playerIds) ?? [];
    const partnerIds = (
      (flipperSide === "team1" ? tie.side1?.playerIds : tie.side2?.playerIds) ?? []
    ).filter((id) => id !== userId);
    const hostName = ladderPlayoffTeamName(
      toss.firstHost === "team1" ? tie.team1 : tie.team2,
    );
    const ladderSnapshot = await ladderRef.get();
    const ladderName = (ladderSnapshot.data() as Ladder | undefined)?.name ?? "the ladder";
    await notifyLadderPlayers({
      userIds: [...opponentIds, ...partnerIds],
      ladder: { ladderId },
      kind: `playoff-coin-${tieId}`,
      title: "Coin flipped",
      message: `The coin has been flipped for your playoff game in ${ladderName}: ${hostName} hosts the first match.`,
      tab: "Playoffs",
      data: { tieId },
    });
  }

  const flippedAt =
    toss.flippedAt instanceof Date
      ? toss.flippedAt
      : (toss.flippedAt as unknown as admin.firestore.Timestamp).toDate();
  return {
    firstHost: toss.firstHost,
    flippedBy: toss.flippedBy,
    flippedAt: flippedAt.toISOString(),
    alreadyFlipped,
  };
};

export const flipLadderPlayoffCoin = onCall(async (request) =>
  runFlipLadderPlayoffCoin({
    userId: request.auth?.uid,
    data: request.data as Partial<FlipLadderPlayoffCoinData> | undefined,
  }),
);
