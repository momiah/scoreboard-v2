import { useCallback, useContext } from "react";

import { canDeclineLadderPlayoffMatch } from "@shared/helpers";
import type { LadderMatch } from "@shared/types";
import { LadderContext } from "../context/LadderContext";
import { UserContext } from "../context/UserContext";
import { PopupContext } from "../context/PopupContext";
import { formatDisplayName } from "../helpers/formatDisplayName";
import { formatMatchSlot } from "./useLadderMatchChanges";
import { useNotifyMatchPlayers } from "./useNotifyMatchPlayers";

const ERROR_MESSAGE = "Something went wrong. Please try again.";

const matchLabel = (
  match: Pick<LadderMatch, "playoffLeg" | "court" | "matchDate" | "matchTime">,
) =>
  `playoff match ${match.playoffLeg ?? ""} at ${match.court?.courtName ?? "your court"}, ${formatMatchSlot(match)}`;

export const usePlayoffMatchScheduling = () => {
  const { respondToPlayoffMatch, offerPlayoffMatchHere } =
    useContext(LadderContext);
  const { currentUser } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);
  const notify = useNotifyMatchPlayers();

  const userId: string | undefined = currentUser?.userId;
  const name = formatDisplayName(currentUser);

  const notifyArranged = useCallback(
    async ({
      ladderId,
      match,
      opponentIds,
    }: {
      ladderId: string;
      match: LadderMatch;
      opponentIds: string[];
    }) => {
      const next = canDeclineLadderPlayoffMatch(match)
        ? "Open it to accept or decline."
        : "Open it to accept.";
      await notify(
        opponentIds,
        `${name} arranged ${matchLabel(match)}. ${next}`,
        { ladderId, match },
      );
    },
    [name, notify],
  );

  const respond = useCallback(
    async ({
      ladderId,
      match,
      accept,
    }: {
      ladderId: string;
      match: LadderMatch;
      accept: boolean;
    }) => {
      if (!userId) return;
      const outcome = await respondToPlayoffMatch({
        ladderId,
        matchId: match.ladderMatchId,
        userId,
        accept,
      });
      if (!outcome.success) {
        showBottomToast(
          outcome.reason === "not_allowed"
            ? "This match can no longer be changed"
            : ERROR_MESSAGE,
          "error",
        );
        return;
      }
      await notify(
        outcome.notifyUserIds,
        accept
          ? `${name} accepted ${matchLabel(match)}.`
          : `${name} can't make ${matchLabel(match)}. Arrange another time.`,
        { ladderId, match },
      );
      showBottomToast(accept ? "Match accepted" : "Time declined", "success");
    },
    [name, notify, respondToPlayoffMatch, showBottomToast, userId],
  );

  const offerHere = useCallback(
    async ({
      ladderId,
      firstMatch,
    }: {
      ladderId: string;
      firstMatch: LadderMatch;
    }) => {
      if (!userId) return;
      const outcome = await offerPlayoffMatchHere({
        ladderId,
        firstMatch,
        userId,
      });
      if (!outcome.success) {
        showBottomToast(
          outcome.reason === "not_allowed"
            ? "Match 2 has already been arranged"
            : ERROR_MESSAGE,
          "error",
        );
        return;
      }
      await notify(
        outcome.notifyUserIds,
        `${name} wants to play match 2 now at ${firstMatch.court?.courtName ?? "your court"}. Open the game to accept or decline.`,
        { ladderId, match: firstMatch },
      );
    },
    [name, notify, offerPlayoffMatchHere, showBottomToast, userId],
  );

  return { notifyArranged, respond, offerHere };
};
