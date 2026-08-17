import React, { useContext, useEffect, useMemo, useState } from "react";
import { Dimensions, View } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { LADDER_STATUS, COMPETITION_TYPES } from "@shared";
import type { Ladder, ScoreboardProfile } from "@shared/types";
import { calculateLadderPrizePool } from "@shared/helpers";
import { sortPlayersByPlacement } from "@shared/helpers/getRankInCompetition";

import PrizeDistribution from "./PrizeDistribution";
import PrizeContenders from "./PrizeContenders";
import ParticipantCarousel from "./ParticipantCarousel";
import PhaseTimeline from "./PhaseTimeline";
import { UserContext } from "../../context/UserContext";
import { enrichPlayers } from "../../helpers/enrichPlayers";
import { formatCurrency } from "../../helpers/formatCurrency";
import { LADDER_DISTRIBUTION } from "../../helpers/ladderPrizeDistribution";
import { timeLeftToPlayoffs } from "../../helpers/ladderPhases";

const PLACEHOLDER_CONTENDERS = Array.from({ length: 4 }, (_, index) => ({
  userId: `placeholder-${index}`,
  username: "",
  numberOfWins: 0,
})) as unknown as ScoreboardProfile[];

const STATS_ROW_ICON_SIZE = 15;

const LADDER_TOOLTIP =
  "Court Points (CP) — and cash on paid ladders — are shared across the top finishers.";

const LadderStatsRow: React.FC<{ ladder: Ladder }> = ({ ladder }) => {
  const isPaid = ladder.entryFee > 0;
  const playoffCountdown = useMemo(() => timeLeftToPlayoffs(ladder), [ladder]);

  return (
    <StatsRow testID="ladder-stats-row">
      <StatBlock>
        <StatLabel>Players</StatLabel>
        <StatHeadingContainer>
          <StatValue testID="ladder-players">
            {ladder.participantCount} / {ladder.maxPlayers}
          </StatValue>
          {/* <Ionicons
            name="people-outline"
            size={STATS_ROW_ICON_SIZE}
            color="#00A2FF"
          /> */}
        </StatHeadingContainer>
      </StatBlock>
      <StatDivider />
      <StatBlock>
        <StatLabel>Entry Fee</StatLabel>
        <StatHeadingContainer>
          <StatValue testID="ladder-entry-fee">
            {isPaid
              ? formatCurrency(ladder.entryFee, ladder.currencyType)
              : "Free"}
          </StatValue>

          {/* <Ionicons
            name="cash-outline"
            size={STATS_ROW_ICON_SIZE}
            color="#00A2FF"
          /> */}
        </StatHeadingContainer>
      </StatBlock>
      <StatDivider />
      <StatBlock>
        <StatLabel>To Playoffs</StatLabel>

        <StatHeadingContainer>
          <StatValue testID="ladder-playoff-countdown">
            {playoffCountdown}
          </StatValue>
          {/* <Ionicons
            name="hourglass-outline"
            size={STATS_ROW_ICON_SIZE}
            color="#00A2FF"
          /> */}
        </StatHeadingContainer>
      </StatBlock>
    </StatsRow>
  );
};

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
      <LadderStatsRow ladder={ladder} />
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

      <View style={{ marginTop: 20 }}>
        <ParticipantCarousel
          participants={participants}
          viewAllText="View All Participants"
          onViewAll={() => {}}
        />
      </View>

      <PhaseTimeline ladder={ladder} />

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
  marginBottom: 40,
});

const PrizePotValue = styled.Text({
  fontSize: screenWidth <= 405 ? 30 : 34,
  fontWeight: "bold",
  color: "#ffc800ff",
});

const TableContainer = styled.View({
  paddingTop: 10,
  paddingBottom: 20,
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
  marginBottom: 20,
  padding: 16,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  borderWidth: 1,
  borderColor: "#192336",
});

const StatHeadingContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
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
