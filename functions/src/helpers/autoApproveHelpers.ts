// functions/helpers/autoApproveHelpers.ts
import { Game } from "courtchamps-shared/types";
import { notificationTypes } from "courtchamps-shared";
import { LEAGUE_AUTO_APPROVE_HOURS } from "courtchamps-shared/helpers";
import * as admin from "firebase-admin";
import moment from "moment-timezone";

const TIMEZONE = "Europe/London";

const isTimestampLike = (v: unknown): v is { toDate: () => Date } =>
  typeof (v as { toDate?: unknown })?.toDate === "function";

export const toMomentTimezone = (
  value: admin.firestore.Timestamp | Date | string,
) => {
  if (isTimestampLike(value)) return moment.tz(value.toDate(), TIMEZONE);
  return moment.tz(value, TIMEZONE);
};

export { getGamePlayerIds } from "courtchamps-shared/helpers";

export const isDueForAutoApproval = (game: Game): boolean => {
  const gameCreatedAt = toMomentTimezone(game.createdAt);
  if (!gameCreatedAt.isValid()) return false;
  const hoursSinceCreation = moment
    .tz(TIMEZONE)
    .diff(gameCreatedAt, "hours", true);
  return (
    game.approvalStatus?.toLowerCase() === "pending" &&
    hoursSinceCreation >= LEAGUE_AUTO_APPROVE_HOURS &&
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
