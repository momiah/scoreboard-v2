import { useCallback, useContext } from "react";

import type { LadderMatch } from "@shared/types";
import { LadderContext } from "../context/LadderContext";
import { UserContext } from "../context/UserContext";
import { PopupContext } from "../context/PopupContext";
import { formatDisplayName } from "../helpers/formatDisplayName";
import { getSameSideIds } from "../helpers/ladderMatchCancellation";
import { playoffMatchMessages } from "../helpers/playoffMatchMessages";
import { useNotifyMatchPlayers } from "./useNotifyMatchPlayers";

const ERROR_MESSAGE = "Something went wrong. Please try again.";

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
      teammateIds = [],
    }: {
      ladderId: string;
      match: LadderMatch;
      opponentIds: string[];
      teammateIds?: string[];
    }) => {
      await Promise.all([
        notify(opponentIds, playoffMatchMessages.arranged(name, match), {
          ladderId,
          match,
        }),
        notify(
          teammateIds,
          playoffMatchMessages.arrangedByPartner(name, match),
          { ladderId, match },
        ),
      ]);
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
      await Promise.all([
        notify(
          outcome.notifyUserIds,
          accept
            ? playoffMatchMessages.accepted(name, match)
            : playoffMatchMessages.declined(name, match),
          { ladderId, match },
        ),
        notify(
          getSameSideIds(match, userId),
          playoffMatchMessages.answeredByPartner(name, match, accept),
          { ladderId, match },
        ),
      ]);
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
      await Promise.all([
        notify(
          outcome.notifyUserIds,
          playoffMatchMessages.playNowOffer(name, firstMatch.court?.courtName),
          { ladderId, match: firstMatch },
        ),
        notify(
          getSameSideIds(firstMatch, userId),
          playoffMatchMessages.playNowOfferByPartner(
            name,
            firstMatch.court?.courtName,
          ),
          { ladderId, match: firstMatch },
        ),
      ]);
    },
    [name, notify, offerPlayoffMatchHere, showBottomToast, userId],
  );

  return { notifyArranged, respond, offerHere };
};
