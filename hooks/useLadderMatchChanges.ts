import { useCallback, useContext } from "react";
import moment from "moment";

import { getLadderMatchExtensionDaysLeft } from "@shared/helpers";
import type { LadderMatch, MatchTime } from "@shared/types";
import { LadderContext } from "../context/LadderContext";
import { UserContext } from "../context/UserContext";
import { PopupContext } from "../context/PopupContext";
import { formatDisplayName } from "../helpers/formatDisplayName";
import { getMatchStart } from "../helpers/ladderMatchTime";
import { useNotifyMatchPlayers } from "./useNotifyMatchPlayers";

interface MatchArgs {
  ladderId: string;
  match: LadderMatch;
}

const ERROR_MESSAGE = "Something went wrong. Please try again.";

export const formatMatchSlot = (time: {
  matchDate: string;
  matchTime: MatchTime;
}): string => {
  const start = getMatchStart(time);
  return start ? moment(start).format("ddd D MMM, HH:mm") : time.matchDate;
};

export const extensionDaysText = (days: number): string =>
  `Your extension has ${days} ${days === 1 ? "day" : "days"} left to complete your match.`;

export const useLadderMatchChanges = () => {
  const {
    requestLadderMatchReschedule,
    respondToLadderMatchReschedule,
    extendLadderMatch,
  } = useContext(LadderContext);
  const { currentUser } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);
  const notify = useNotifyMatchPlayers();

  const userId: string | undefined = currentUser?.userId;
  const name = formatDisplayName(currentUser);
  const courtName = (match: LadderMatch) =>
    match.court?.courtName ?? "your court";

  const requestReschedule = useCallback(
    async (
      args: MatchArgs & {
        matchDate: string;
        matchTime: MatchTime;
      },
    ): Promise<string | null> => {
      if (!userId) return ERROR_MESSAGE;
      const outcome = await requestLadderMatchReschedule({
        ladderId: args.ladderId,
        matchId: args.match.ladderMatchId,
        userId,
        matchDate: args.matchDate,
        matchTime: args.matchTime,
      });
      if (!outcome.success) {
        if (outcome.reason === "order") {
          return "Playoff match 1 must be played before match 2.";
        }
        if (outcome.reason === "invalid_time")
          return "Pick a time in the future, before the deadline.";
        if (outcome.reason === "not_allowed")
          return "This match can no longer be rescheduled.";
        return ERROR_MESSAGE;
      }
      await notify(
        outcome.notifyUserIds,
        `${name} asked to move your ladder match at ${courtName(args.match)} to ${formatMatchSlot(args)}`,
        args,
      );
      showBottomToast("Reschedule request sent", "success");
      return null;
    },
    [name, notify, requestLadderMatchReschedule, showBottomToast, userId],
  );

  const respondToReschedule = useCallback(
    async (args: MatchArgs & { accept: boolean }) => {
      if (!userId) return;
      const request = args.match.rescheduleRequest;
      const outcome = await respondToLadderMatchReschedule({
        ladderId: args.ladderId,
        matchId: args.match.ladderMatchId,
        userId,
        accept: args.accept,
      });
      if (!outcome.success) {
        showBottomToast(
          outcome.reason === "invalid_time"
            ? "That time has already passed, so the request was cleared"
            : outcome.reason === "not_allowed"
              ? "This reschedule request is no longer open"
              : ERROR_MESSAGE,
          "error",
        );
        return;
      }
      await notify(
        outcome.notifyUserIds,
        args.accept && request
          ? `${name} agreed to move your ladder match at ${courtName(args.match)} to ${formatMatchSlot(request)}`
          : `${name} declined to move your ladder match at ${courtName(args.match)}. The original time stands.`,
        args,
      );
      showBottomToast(
        args.accept ? "Match moved" : "Reschedule declined",
        "success",
      );
    },
    [name, notify, respondToLadderMatchReschedule, showBottomToast, userId],
  );

  const extendMatch = useCallback(
    async (args: MatchArgs): Promise<boolean> => {
      if (!userId) return false;
      const outcome = await extendLadderMatch({
        ladderId: args.ladderId,
        matchId: args.match.ladderMatchId,
        userId,
      });
      if (!outcome.success || !outcome.expiresAt) {
        showBottomToast(
          outcome.reason === "not_allowed"
            ? "This match can no longer be extended"
            : ERROR_MESSAGE,
          "error",
        );
        return false;
      }
      const days = getLadderMatchExtensionDaysLeft(
        outcome.expiresAt.getTime(),
        Date.now(),
      );
      await notify(
        outcome.notifyUserIds,
        `${name} extended your ladder match at ${courtName(args.match)}. ${extensionDaysText(days)}`,
        args,
      );
      showBottomToast(extensionDaysText(days), "success");
      return true;
    },
    [extendLadderMatch, name, notify, showBottomToast, userId],
  );

  return { requestReschedule, respondToReschedule, extendMatch };
};
