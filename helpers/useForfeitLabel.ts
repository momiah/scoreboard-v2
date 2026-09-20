import { useContext, useEffect, useState } from "react";

import type { LadderMatch } from "@shared/types";

import { UserContext } from "../context/UserContext";
import { LadderContext } from "../context/LadderContext";
import { formatDisplayName } from "./formatDisplayName";

/**
 * Resolve the name of the side that forfeited a walkover, for the status pill.
 * Lives here (not in a screen) so every surface that shows a match card — the
 * schedule and the match details header — resolves the same name from the same
 * source and can never disagree. Returns "" until resolved or when the match is
 * not a walkover; a ladderId is required to look up a doubles team name.
 */
export const useForfeitLabel = (
  match: LadderMatch,
  ladderId?: string,
): string => {
  const { getUserById } = useContext(UserContext);
  const { fetchLadderTeams } = useContext(LadderContext);

  const [forfeitLabel, setForfeitLabel] = useState("");
  const walkoverWinner = match.walkover ? match.walkoverWinner : undefined;

  useEffect(() => {
    if (!match.walkover || !walkoverWinner) {
      setForfeitLabel("");
      return;
    }
    const isDoubles = (match.teams?.length ?? 0) >= 2;
    let active = true;
    (async () => {
      try {
        if (isDoubles) {
          const loserKey = (match.teams ?? []).find(
            (t) => t.teamKey !== walkoverWinner,
          )?.teamKey;
          const teams = ladderId ? await fetchLadderTeams(ladderId) : [];
          const loser = teams.find((t) => t.teamKey === loserKey);
          const label = loser
            ? loser.teamName?.trim() || (loser.team ?? []).join(" & ")
            : "";
          if (active) setForfeitLabel(label);
        } else {
          const loserId = match.participants.find((id) => id !== walkoverWinner);
          const loser = loserId ? await getUserById(loserId) : null;
          if (active) setForfeitLabel(loser ? formatDisplayName(loser) : "");
        }
      } catch (error) {
        console.error("Error resolving forfeit label:", error);
        if (active) setForfeitLabel("");
      }
    })();
    return () => {
      active = false;
    };
  }, [
    match.walkover,
    walkoverWinner,
    match.teams,
    match.participants,
    ladderId,
    fetchLadderTeams,
    getUserById,
  ]);

  return forfeitLabel;
};
