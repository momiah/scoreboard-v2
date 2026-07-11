// functions/helpers/autoApproveHelpers.ts
import { Game } from "@shared/types";
import { notificationTypes } from "@shared";
import * as admin from "firebase-admin";
import moment from "moment-timezone";

const TIMEZONE = "Europe/London";
const AUTO_APPROVE_AFTER_HOURS = 24;

export const toMomentTimezone = (value: any) => {
  if (value?.toDate) return moment.tz(value.toDate(), TIMEZONE);
  return moment.tz(value, TIMEZONE);
};

export const getGamePlayerIds = (game: Game): string[] =>
  [
    game.team1.player1?.userId,
    game.team1.player2?.userId,
    game.team2.player1?.userId,
    game.team2.player2?.userId,
  ].filter((id): id is string => !!id);

export const isDueForAutoApproval = (game: Game): boolean => {
  const gameCreatedAt = toMomentTimezone(game.createdAt);
  if (!gameCreatedAt.isValid()) return false;
  const hoursSinceCreation = moment
    .tz(TIMEZONE)
    .diff(gameCreatedAt, "hours", true);
  return (
    game.approvalStatus?.toLowerCase() === "pending" &&
    hoursSinceCreation >= AUTO_APPROVE_AFTER_HOURS &&
    (game.numberOfDeclines || 0) === 0
  );
};

export const markGameApproved = (game: Game): Game => ({
  ...game,
  approvers: [
    ...(game.approvers || []),
    { userId: "system", username: "AutoApproval" },
  ],
  approvalStatus: notificationTypes.RESPONSE.APPROVED_GAME,
  autoApproved: true,
  autoApprovedAt: admin.firestore.Timestamp.now().toDate(),
});
