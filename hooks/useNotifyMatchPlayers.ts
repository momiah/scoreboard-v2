import { useCallback, useContext } from "react";

import { notificationSchema, notificationTypes } from "@shared";
import type { LadderMatch } from "@shared/types";
import { UserContext } from "../context/UserContext";

export const useNotifyMatchPlayers = () => {
  const { currentUser, sendNotification } = useContext(UserContext);
  const userId: string | undefined = currentUser?.userId;

  return useCallback(
    async (
      recipientIds: string[] | undefined,
      message: string,
      { ladderId, match }: { ladderId: string; match: LadderMatch },
    ) => {
      await Promise.all(
        (recipientIds ?? [])
          .filter((recipientId) => recipientId && recipientId !== userId)
          .map((recipientId) =>
            sendNotification({
              ...notificationSchema,
              createdAt: new Date(),
              recipientId,
              senderId: userId,
              message,
              type: notificationTypes.INFORMATION.LADDER.TYPE,
              data: match.playoffTieId
                ? { ladderId, tieId: match.playoffTieId, tab: "Playoffs" }
                : { ladderId, matchId: match.ladderMatchId, tab: "Schedule" },
            }).catch((error: unknown) =>
              console.error("Error sending match notification:", error),
            ),
          ),
      );
    },
    [sendNotification, userId],
  );
};
