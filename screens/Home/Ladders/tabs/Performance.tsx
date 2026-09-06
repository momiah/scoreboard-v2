import React, { useCallback, useContext, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import styled from "styled-components/native";

import { LADDER_TYPE } from "@shared";
import type { Ladder, ScoreboardProfile } from "@shared/types";

import { LadderContext } from "../../../../context/LadderContext";
import PlayerPerformance from "../../../../components/performance/Player/PlayerPerformance";

interface PerformanceProps {
  ladder: Ladder;
}

// Singles ladder standings: the per-ladder participant records (their in-ladder
// CP + stats) are what approveLadderGame updates, so this reads straight from
// the ladderParticipants subcollection. Doubles standings come from ladderTeams
// and are wired in a later phase (see the commented team path below).
const Performance: React.FC<PerformanceProps> = ({ ladder }) => {
  const { fetchLadderParticipants } = useContext(LadderContext);

  const [participants, setParticipants] = useState<ScoreboardProfile[]>([]);

  const isDoubles = ladder.ladderType === LADDER_TYPE.DOUBLES;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          const rows = await fetchLadderParticipants(ladder.ladderId);
          if (active) setParticipants(rows);
        } catch (error) {
          console.error("Error loading ladder participants:", error);
          if (active) setParticipants([]);
        }
      };
      load();
      return () => {
        active = false;
      };
    }, [fetchLadderParticipants, ladder.ladderId]),
  );

  // ── DOUBLES (ready to implement) ──────────────────────────────────────────
  // Doubles matchmaking doesn't exist yet, so ladders are singles-only for now.
  // When doubles ships, load ladderTeams and render the team standings:
  //
  // const { fetchLadderTeams } = useContext(LadderContext);
  // const [teams, setTeams] = useState<TeamStats[]>([]);
  // ... fetchLadderTeams(ladder.ladderId) in the focus effect ...
  // return <TeamPerformance leagueTeams={teams} />;
  if (isDoubles) {
    return (
      <ComingSoon testID="ladder-team-performance-soon">
        <ComingSoonText>Team standings coming soon</ComingSoonText>
      </ComingSoon>
    );
  }

  return (
    <Container testID="ladder-player-performance">
      <PlayerPerformance playersData={participants} ladder={ladder} />
    </Container>
  );
};

export default Performance;

const Container = styled.View({
  flex: 1,
});

const ComingSoon = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 40,
});

const ComingSoonText = styled.Text({
  color: "#9fb8c8",
  fontSize: 14,
  fontWeight: "bold",
});
