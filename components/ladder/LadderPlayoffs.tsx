import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components/native";

import { LADDER_STATUS, LADDER_TYPE } from "@shared";
import {
  LADDER_MIN_PLAYOFF_SIZE,
  getLadderPlayoffStructureForRegistrations,
  ladderPlayoffTiesToFixtures,
} from "@shared/helpers";
import type { Ladder, LadderPlayoffTie } from "@shared/types";
import BracketTree from "../Tournaments/Brackets/BracketTree";
import { SkeletonWrapper } from "../Skeletons/SkeletonComponents";
import { LadderContext } from "../../context/LadderContext";
import { UserContext } from "../../context/UserContext";
import { findUserPlayoffTie } from "../../helpers/ladderPlayoffTies";
import { toMoment } from "../../helpers/ladderPhases";

const SKELETON_ROWS = [0, 1, 2];

interface LadderPlayoffsProps {
  ladder: Ladder;
}

const LadderPlayoffs: React.FC<LadderPlayoffsProps> = ({ ladder }) => {
  const { subscribeToLadderPlayoffTies } = useContext(LadderContext);
  const { currentUser } = useContext(UserContext);
  const [ties, setTies] = useState<LadderPlayoffTie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    return subscribeToLadderPlayoffTies(
      ladder.ladderId,
      (next) => {
        setTies(next);
        setLoading(false);
      },
      () => {
        setTies([]);
        setLoading(false);
      },
    );
  }, [ladder.ladderId, subscribeToLadderPlayoffTies]);

  const fixtures = useMemo(() => ladderPlayoffTiesToFixtures(ties), [ties]);
  const userTieId = useMemo(
    () => findUserPlayoffTie(ties, currentUser?.userId)?.tieId,
    [ties, currentUser?.userId],
  );

  if (loading) {
    return (
      <Container testID="ladder-playoffs-loading">
        {SKELETON_ROWS.map((row) => (
          <SkeletonWrapper key={row} show height={180} width="100%" radius={12} />
        ))}
      </Container>
    );
  }

  if (fixtures.length > 0) {
    return (
      <BracketContainer testID="ladder-playoffs-bracket">
        <BracketTree
          fixtures={fixtures}
          tournamentType={ladder.ladderType}
          onGamePress={() => {}}
          scrollToGameId={userTieId}
        />
      </BracketContainer>
    );
  }

  const entrantLabel =
    ladder.ladderType === LADDER_TYPE.DOUBLES ? "teams" : "players";
  const { playoffSpots } = getLadderPlayoffStructureForRegistrations(
    ladder.participantCount,
    ladder.maxPlayers,
  );
  const playoffStart = toMoment(ladder.playoffStartsAt);

  const title =
    ladder.status === LADDER_STATUS.CANCELLED
      ? "This ladder was cancelled"
      : "Playoffs haven't started yet";
  const body =
    ladder.status === LADDER_STATUS.CANCELLED
      ? ladder.cancelledReason ?? "There will be no playoffs for this ladder."
      : playoffSpots > 0
        ? `The bracket is created${
            playoffStart?.isValid()
              ? ` on ${playoffStart.format("ddd D MMM [at] HH:mm")}`
              : ""
          }. The top ${playoffSpots} ${entrantLabel} in the ladder qualify, and first-round opponents are paired by home court distance.`
        : `Playoffs need at least ${LADDER_MIN_PLAYOFF_SIZE} ${entrantLabel} when registration closes.`;

  return (
    <EmptyState testID="ladder-playoffs-empty">
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyBody>{body}</EmptyBody>
    </EmptyState>
  );
};

export default LadderPlayoffs;

const Container = styled.View({
  padding: 20,
  gap: 12,
});

const BracketContainer = styled.View({
  flex: 1,
});

const EmptyState = styled.View({
  paddingVertical: 40,
  paddingHorizontal: 24,
  alignItems: "center",
  gap: 8,
});

const EmptyTitle = styled.Text({
  color: "#e2e8f0",
  fontSize: 16,
  fontWeight: "bold",
  textAlign: "center",
});

const EmptyBody = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  lineHeight: 19,
  textAlign: "center",
});
