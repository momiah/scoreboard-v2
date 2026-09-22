import { useContext, useEffect, useState } from "react";

import type { LadderMatch } from "@shared/types";

import { UserContext } from "../context/UserContext";
import { LadderContext } from "../context/LadderContext";
import { formatDisplayName } from "./formatDisplayName";

export const useForfeitLabel = (
  match: LadderMatch | null | undefined,
  ladderId?: string,
): string => {
  const { getUserById } = useContext(UserContext);
  const { fetchLadderTeams } = useContext(LadderContext);

  const [forfeitLabel, setForfeitLabel] = useState("");
  const walkoverWinner = match?.walkover ? match.walkoverWinner : undefined;
  const teams = match?.teams;
  const participants = match?.participants;

  useEffect(() => {
    if (!walkoverWinner) {
      setForfeitLabel("");
      return;
    }
    const isDoubles = (teams?.length ?? 0) >= 2;
    let active = true;
    (async () => {
      try {
        if (isDoubles) {
          const loserKey = (teams ?? []).find(
            (t) => t.teamKey !== walkoverWinner,
          )?.teamKey;
          const ladderTeams = ladderId ? await fetchLadderTeams(ladderId) : [];
          const loser = ladderTeams.find((t) => t.teamKey === loserKey);
          const label = loser
            ? loser.teamName?.trim() || (loser.team ?? []).join(" & ")
            : "";
          if (active) setForfeitLabel(label);
        } else {
          const loserId = (participants ?? []).find(
            (id) => id !== walkoverWinner,
          );
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
  }, [walkoverWinner, teams, participants, ladderId, fetchLadderTeams, getUserById]);

  return forfeitLabel;
};
