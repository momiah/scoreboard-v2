import React, { useContext, useEffect, useMemo, useState } from "react";
import { Dimensions, View } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import {
  LADDER_STATUS,
  COMPETITION_TYPES,
  getLadderPhaseState,
  type LadderPhaseState,
} from "@shared";
import type { Ladder, ScoreboardProfile } from "@shared/types";
import { calculateLadderPrizePool } from "@shared/helpers";
import { sortPlayersByPlacement } from "@shared/helpers/getRankInCompetition";

import PrizeDistribution from "./PrizeDistribution";
import PrizeContenders from "./PrizeContenders";
import ParticipantCarousel from "./ParticipantCarousel";
import { UserContext } from "../../context/UserContext";
import { enrichPlayers } from "../../helpers/enrichPlayers";
import { formatCurrency } from "../../helpers/formatCurrency";
import { LADDER_DISTRIBUTION } from "../../helpers/ladderPrizeDistribution";
import {
  getLadderPhases,
  formatPhaseRange,
  timeLeftToPlayoffs,
} from "../../helpers/ladderPhases";

const PLACEHOLDER_CONTENDERS = Array.from({ length: 4 }, (_, index) => ({
  userId: `placeholder-${index}`,
  username: "",
  numberOfWins: 0,
})) as unknown as ScoreboardProfile[];

const LADDER_TOOLTIP =
  "Court Points (CP) — and cash on paid ladders — are shared across the top finishers.";

interface LadderSummaryProps {
  ladder: Ladder;
}

const LadderSummary: React.FC<LadderSummaryProps> = ({ ladder }) => {
  const { getUserById } = useContext(UserContext);
  const [topContenders, setTopContenders] = useState<ScoreboardProfile[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const isPaid = ladder.entryFee > 0;
  const participants = useMemo(
    () => ladder.ladderParticipants ?? [],
    [ladder.ladderParticipants],
  );

  const prizePool = useMemo(
    () =>
      calculateLadderPrizePool({
        entryFee: ladder.entryFee,
        participantCount: ladder.participantCount,
      }),
    [ladder.entryFee, ladder.participantCount],
  );

  const hasPrizesDistributed =
    ladder.status === LADDER_STATUS.COMPLETED || ladder.prizesDistributed;

  const phases = useMemo(() => getLadderPhases(ladder), [ladder]);
  const playoffCountdown = useMemo(() => timeLeftToPlayoffs(ladder), [ladder]);

  useEffect(() => {
    let active = true;
    const loadContenders = async () => {
      setIsDataLoading(true);
      const withWins = participants.filter((p) => (p.numberOfWins ?? 0) > 0);
      if (withWins.length === 0) {
        if (active) setTopContenders([]);
      } else {
        try {
          const enriched = (await enrichPlayers(
            getUserById,
            withWins,
          )) as ScoreboardProfile[];
          if (active)
            setTopContenders(sortPlayersByPlacement(enriched).slice(0, 4));
        } catch (error) {
          console.error("Error enriching ladder players:", error);
          if (active) setTopContenders([]);
        }
      }
      if (active) setIsDataLoading(false);
    };
    loadContenders();
    return () => {
      active = false;
    };
  }, [participants, getUserById]);

  const renderContenders = isDataLoading
    ? PLACEHOLDER_CONTENDERS
    : topContenders;

  return (
    <Container testID="ladder-summary">
      {isPaid && (
        <PrizePotCard>
          <SectionTitle>Total Prize Pool</SectionTitle>
          <PrizePotValue testID="ladder-cash-pot">
            {formatCurrency(prizePool.cash, ladder.currencyType)}
          </PrizePotValue>
        </PrizePotCard>
      )}

      <PrizeDistribution
        prizePool={prizePool.xp}
        cashPool={isPaid ? prizePool.cash : undefined}
        currencyType={ladder.currencyType}
        distribution={LADDER_DISTRIBUTION}
        competitionType={COMPETITION_TYPES.LADDER}
        tooltipMessage={LADDER_TOOLTIP}
        onViewFullDistribution={() => {}}
      />

      <SectionTitleRow>
        {hasPrizesDistributed ? (
          <>
            <SectionTitle>Prize Winners</SectionTitle>
            <Ionicons name="checkmark-circle" size={20} color="green" />
          </>
        ) : (
          <>
            <SectionTitle>Top Contenders</SectionTitle>
            <Ionicons name="hourglass-outline" size={20} color="#FF9800" />
          </>
        )}
      </SectionTitleRow>

      <TableContainer>
        {!isDataLoading && renderContenders.length === 0 ? (
          <EmptyState>
            <EmptyStateText>
              Top contenders will appear here once players start winning games.
            </EmptyStateText>
          </EmptyState>
        ) : (
          renderContenders.map((player, index) => (
            <PrizeContenders
              key={player.userId}
              item={player}
              index={index}
              isDataLoading={isDataLoading}
              distribution={LADDER_DISTRIBUTION}
              prizePool={prizePool.xp}
              cashPool={isPaid ? prizePool.cash : undefined}
              currencyType={ladder.currencyType}
              hasPrizesDistributed={hasPrizesDistributed}
              competitionType={COMPETITION_TYPES.LADDER}
            />
          ))
        )}
      </TableContainer>

      <StatsRow testID="ladder-stats-row">
        <StatBlock>
          <Ionicons name="people-outline" size={18} color="#00A2FF" />
          <StatValue testID="ladder-players">
            {ladder.participantCount} / {ladder.maxPlayers}
          </StatValue>
          <StatLabel>Players</StatLabel>
        </StatBlock>
        <StatDivider />
        <StatBlock>
          <Ionicons name="cash-outline" size={18} color="#00A2FF" />
          <StatValue testID="ladder-entry-fee">
            {isPaid
              ? formatCurrency(ladder.entryFee, ladder.currencyType)
              : "Free"}
          </StatValue>
          <StatLabel>Entry Fee</StatLabel>
        </StatBlock>
        <StatDivider />
        <StatBlock>
          <Ionicons name="hourglass-outline" size={18} color="#00A2FF" />
          <StatValue testID="ladder-playoff-countdown">
            {playoffCountdown}
          </StatValue>
          <StatLabel>To Playoffs</StatLabel>
        </StatBlock>
      </StatsRow>

      <View style={{ marginTop: 20 }}>
        <ParticipantCarousel
          participants={participants}
          viewAllText="View All Participants"
          onViewAll={() => {}}
        />
      </View>

      <Timeline>
        <TimelineHeader>Phase Timeline</TimelineHeader>
        {phases.map((phase, index) => {
          const state = getLadderPhaseState(ladder.status, phase.status);
          const isFirst = index === 0;
          const isLast = index === phases.length - 1;
          return (
            <TimelineRow key={phase.status} testID={`ladder-phase-${phase.status}`}>
              <Gutter>
                {!isFirst && (
                  <LineTop filled={state === "completed" || state === "active"} />
                )}
                {!isLast && <LineBottom filled={state === "completed"} />}
                <Dot state={state} />
              </Gutter>
              <PhaseContent last={isLast}>
                <PhaseLabel state={state}>{phase.label}</PhaseLabel>
                <PhaseRange>{formatPhaseRange(phase)}</PhaseRange>
                <PhaseDescription>{phase.description}</PhaseDescription>
              </PhaseContent>
            </TimelineRow>
          );
        })}
      </Timeline>

      <View style={{ height: 40 }} />
    </Container>
  );
};

export default LadderSummary;

const { width: screenWidth } = Dimensions.get("window");

const Container = styled.ScrollView({
  padding: 20,
});

const SectionTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "#ffffff",
});

const SectionTitleRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginTop: 10,
});

const PrizePotCard = styled.View({
  padding: 20,
  borderRadius: 14,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderWidth: 1,
  borderColor: "rgba(0, 162, 255, 0.35)",
  alignItems: "center",
  gap: 6,
  marginBottom: 20,
});

const PrizePotValue = styled.Text({
  fontSize: screenWidth <= 405 ? 30 : 34,
  fontWeight: "bold",
  color: "#ffc800ff",
});

const TableContainer = styled.View({
  paddingTop: 10,
  paddingBottom: 10,
});

const EmptyState = styled.View({
  paddingVertical: 20,
  paddingHorizontal: 20,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderRadius: 8,
});

const EmptyStateText = styled.Text({
  fontSize: screenWidth <= 405 ? 13 : 14,
  color: "#aaa",
  textAlign: "center",
});

const StatsRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 20,
  padding: 16,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  borderWidth: 1,
  borderColor: "#192336",
});

const StatBlock = styled.View({
  flex: 1,
  alignItems: "center",
  gap: 4,
});

const StatDivider = styled.View({
  width: 1,
  height: 40,
  backgroundColor: "#192336",
});

const StatValue = styled.Text({
  fontSize: screenWidth <= 405 ? 14 : 16,
  fontWeight: "bold",
  color: "#ffffff",
});

const StatLabel = styled.Text({
  fontSize: 11,
  color: "#9fb8c8",
});

const GUTTER_WIDTH = 24;
const DOT_SIZE = 14;
const DOT_TOP = 4;
const DOT_CENTER_Y = DOT_TOP + DOT_SIZE / 2;
const LINE_LEFT = GUTTER_WIDTH / 2 - 1;

const LINE_DIM = "#22384f";
const LINE_FILLED = "#D4AF37";
const DOT_COLORS: Record<LadderPhaseState, string> = {
  completed: "#D4AF37",
  active: "#FFD700",
  upcoming: "#22384f",
};

const Timeline = styled.View({
  marginTop: 30,
});

const TimelineHeader = styled.Text({
  color: "#6b8199",
  fontSize: 12,
  fontWeight: "600",
  letterSpacing: 1.5,
  textTransform: "uppercase",
  marginBottom: 18,
});

const TimelineRow = styled.View({
  flexDirection: "row",
});

const Gutter = styled.View({
  width: GUTTER_WIDTH,
  position: "relative",
});

const LineTop = styled.View<{ filled: boolean }>(({ filled }) => ({
  position: "absolute",
  top: 0,
  left: LINE_LEFT,
  width: 2,
  height: DOT_CENTER_Y,
  backgroundColor: filled ? LINE_FILLED : LINE_DIM,
}));

const LineBottom = styled.View<{ filled: boolean }>(({ filled }) => ({
  position: "absolute",
  top: DOT_CENTER_Y,
  bottom: 0,
  left: LINE_LEFT,
  width: 2,
  backgroundColor: filled ? LINE_FILLED : LINE_DIM,
}));

const Dot = styled.View<{ state: LadderPhaseState }>(({ state }) => ({
  position: "absolute",
  top: DOT_TOP,
  left: GUTTER_WIDTH / 2 - DOT_SIZE / 2,
  width: DOT_SIZE,
  height: DOT_SIZE,
  borderRadius: DOT_SIZE / 2,
  zIndex: 1,
  backgroundColor: DOT_COLORS[state],
  ...(state === "active"
    ? {
        shadowColor: "#FFD700",
        shadowOpacity: 0.9,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
      }
    : {}),
}));

const PhaseContent = styled.View<{ last: boolean }>(({ last }) => ({
  flex: 1,
  paddingLeft: 8,
  paddingBottom: last ? 0 : 24,
}));

const PhaseLabel = styled.Text<{ state: LadderPhaseState }>(({ state }) => ({
  color: state === "upcoming" ? "#6b8199" : "#ffffff",
  fontSize: 15,
  fontWeight: "bold",
}));

const PhaseRange = styled.Text({
  color: "#5f7d99",
  fontSize: 12,
  marginTop: 3,
});

const PhaseDescription = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  marginTop: 5,
});

