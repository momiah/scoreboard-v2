import { notificationSchema, notificationTypes } from "courtchamps-shared";
import type { Ladder } from "courtchamps-shared/types";

import { sendNotification } from "./sendNotification";

const NOTIFICATIONS_PER_WAVE = 50;

/**
 * Sends one ladder notification to each player, in waves. `kind` makes the
 * notification id deterministic per ladder and player, so a resend overwrites
 * instead of duplicating.
 */
export const notifyLadderPlayers = async ({
  userIds,
  ladder,
  kind,
  title,
  message,
  tab,
  data = {},
}: {
  userIds: string[];
  ladder: Pick<Ladder, "ladderId">;
  kind: string;
  title: string;
  message: string;
  tab: string;
  data?: Record<string, unknown>;
}): Promise<void> => {
  const recipients = [...new Set(userIds.filter(Boolean))];
  for (let start = 0; start < recipients.length; start += NOTIFICATIONS_PER_WAVE) {
    await Promise.all(
      recipients.slice(start, start + NOTIFICATIONS_PER_WAVE).map((recipientId) =>
        sendNotification(
          {
            ...notificationSchema,
            createdAt: new Date(),
            recipientId,
            senderId: "system",
            title,
            message,
            type: notificationTypes.INFORMATION.LADDER.TYPE,
            data: { ladderId: ladder.ladderId, tab, ...data },
          },
          { id: `${kind}-${ladder.ladderId}-${recipientId}` },
        ),
      ),
    );
  }
};
