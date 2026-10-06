import { useCallback, useContext } from "react";
import { Alert } from "react-native";

import { notificationSchema, notificationTypes } from "@shared";
import type { LadderMatch } from "@shared/types";
import { LadderContext } from "../context/LadderContext";
import { UserContext } from "../context/UserContext";
import { PopupContext } from "../context/PopupContext";
import { formatDisplayName } from "../helpers/formatDisplayName";
import {
  LADDER_MATCH_CANCEL_ACTION,
  getLadderMatchCancelAction,
} from "../helpers/ladderMatchCancellation";

interface CancellationArgs {
  ladderId: string;
  match: LadderMatch;
  onDone?: () => void;
}

const NOT_CANCELLABLE_MESSAGE = "This match can no longer be cancelled";
const ERROR_MESSAGE = "Something went wrong. Please try again.";

export const useLadderMatchCancellation = () => {
  const {
    cancelLadderMatch,
    requestLadderMatchCancellation,
    respondToLadderMatchCancellation,
  } = useContext(LadderContext);
  const { currentUser, sendNotification } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);

  const userId: string | undefined = currentUser?.userId;

  const notify = useCallback(
    async (
      recipientIds: string[] | undefined,
      message: string,
      { ladderId, match }: CancellationArgs,
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
              data: {
                ladderId,
                matchId: match.ladderMatchId,
                tab: "Schedule",
              },
            }).catch((error: unknown) =>
              console.error("Error sending cancellation notification:", error),
            ),
          ),
      );
    },
    [sendNotification, userId],
  );

  const courtName = (match: LadderMatch) =>
    match.court?.courtName ?? "your court";

  const cancelPostedMatch = useCallback(
    (args: CancellationArgs) => {
      if (!userId) return;
      Alert.alert(
        "Cancel Match",
        "Cancel this posted match? It will be removed from matchmaking.",
        [
          { text: "Keep Match", style: "cancel" },
          {
            text: "Cancel Match",
            style: "destructive",
            onPress: async () => {
              const outcome = await cancelLadderMatch({
                ladderId: args.ladderId,
                matchId: args.match.ladderMatchId,
                userId,
              });
              if (outcome.success) {
                showBottomToast("Match cancelled", "success");
                args.onDone?.();
                return;
              }
              showBottomToast(
                outcome.reason === "not_cancellable"
                  ? NOT_CANCELLABLE_MESSAGE
                  : ERROR_MESSAGE,
                "error",
              );
            },
          },
        ],
      );
    },
    [cancelLadderMatch, showBottomToast, userId],
  );

  const requestCancellation = useCallback(
    (args: CancellationArgs) => {
      if (!userId) return;
      Alert.alert(
        "Request cancellation",
        "Your opponent will be asked to agree to cancel this match. If they decline, the match goes ahead and must be played.",
        [
          { text: "Keep Match", style: "cancel" },
          {
            text: "Send Request",
            style: "destructive",
            onPress: async () => {
              const outcome = await requestLadderMatchCancellation({
                ladderId: args.ladderId,
                matchId: args.match.ladderMatchId,
                userId,
              });
              if (outcome.success) {
                showBottomToast("Cancellation request sent", "success");
                await notify(
                  outcome.notifyUserIds,
                  `${formatDisplayName(currentUser)} asked to cancel your ladder match at ${courtName(args.match)}`,
                  args,
                );
                args.onDone?.();
                return;
              }
              showBottomToast(
                outcome.reason === "not_cancellable"
                  ? NOT_CANCELLABLE_MESSAGE
                  : ERROR_MESSAGE,
                "error",
              );
            },
          },
        ],
      );
    },
    [currentUser, notify, requestLadderMatchCancellation, showBottomToast, userId],
  );

  const respondToCancellation = useCallback(
    async (args: CancellationArgs & { accept: boolean }) => {
      if (!userId) return;
      const outcome = await respondToLadderMatchCancellation({
        ladderId: args.ladderId,
        matchId: args.match.ladderMatchId,
        userId,
        accept: args.accept,
      });
      if (outcome.success) {
        showBottomToast(
          args.accept ? "Match cancelled" : "Cancellation declined",
          "success",
        );
        await notify(
          outcome.notifyUserIds,
          args.accept
            ? `${formatDisplayName(currentUser)} agreed to cancel your ladder match at ${courtName(args.match)}`
            : `${formatDisplayName(currentUser)} declined to cancel your ladder match at ${courtName(args.match)}. The match goes ahead.`,
          args,
        );
        args.onDone?.();
        return;
      }
      showBottomToast(
        outcome.reason === "not_cancellable"
          ? "This cancellation request is no longer open"
          : ERROR_MESSAGE,
        "error",
      );
    },
    [currentUser, notify, respondToLadderMatchCancellation, showBottomToast, userId],
  );

  const confirmAcceptCancellation = useCallback(
    (args: CancellationArgs) => {
      Alert.alert(
        "Accept cancellation",
        "Cancel this match? Any court fee paid is refunded to the player who accepted the match.",
        [
          { text: "Keep Match", style: "cancel" },
          {
            text: "Cancel Match",
            style: "destructive",
            onPress: () => respondToCancellation({ ...args, accept: true }),
          },
        ],
      );
    },
    [respondToCancellation],
  );

  const startCancellation = useCallback(
    (args: CancellationArgs) => {
      switch (getLadderMatchCancelAction(args.match, userId)) {
        case LADDER_MATCH_CANCEL_ACTION.CANCEL:
          cancelPostedMatch(args);
          return;
        case LADDER_MATCH_CANCEL_ACTION.REQUEST:
          requestCancellation(args);
          return;
        case LADDER_MATCH_CANCEL_ACTION.AWAITING_RESPONSE:
          showBottomToast("Waiting for your opponent to respond", "info");
          return;
        case LADDER_MATCH_CANCEL_ACTION.RESPOND:
          showBottomToast(
            "Your opponent has asked to cancel. Respond on the match screen.",
            "info",
          );
          return;
        default:
          showBottomToast(NOT_CANCELLABLE_MESSAGE, "error");
      }
    },
    [cancelPostedMatch, requestCancellation, showBottomToast, userId],
  );

  return {
    cancelPostedMatch,
    requestCancellation,
    respondToCancellation,
    confirmAcceptCancellation,
    startCancellation,
  };
};
