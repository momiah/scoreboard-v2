import React, { useContext, useEffect, useMemo, useState } from "react";
import { Dimensions, View } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { LADDER_STATUS, COMPETITION_TYPES } from "@shared";
import type { Ladder, ScoreboardProfile } from "@shared/types";
import { calculateLadderPrizePool } from "@shared/helpers";
import {
  sortPlayersByPlacement,
  getPlayerRankInCompetition,
} from "@shared/helpers/getRankInCompetition";

import PrizeDistribution from "./PrizeDistribution";
import PrizeContenders from "./PrizeContenders";
import ParticipantCarousel from "./ParticipantCarousel";
import PhaseTimeline from "./PhaseTimeline";
import JoinLadderModal from "../Modals/JoinLadderModal";
import PerformanceRow from "../performance/Player/PerformanceRow";
import { UserContext } from "../../context/UserContext";
import { LadderContext } from "../../context/LadderContext";
import { useLadderJoin } from "../../hooks/useLadderJoin";
import { enrichPlayers } from "../../helpers/enrichPlayers";
import { formatCurrency } from "../../helpers/formatCurrency";
import { LADDER_DISTRIBUTION } from "../../helpers/ladderPrizeDistribution";
import { timeLeftToPlayoffs } from "../../helpers/ladderPhases";

const PLACEHOLDER_CONTENDERS = Array.from({ length: 4 }, (_, index) => ({
  userId: `placeholder-${index}`,
  username: "",
  numberOfWins: 0,
})) as unknown as ScoreboardProfile[];

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
        </StatHeadingContainer>
      </StatBlock>

      <StatDivider />

      <StatBlock>
        <StatLabel>To Playoffs</StatLabel>

        <StatHeadingContainer>
          <StatValue testID="ladder-playoff-countdown">
            {playoffCountdown}
          </StatValue>
        </StatHeadingContainer>
      </StatBlock>
    </StatsRow>
  );
};

interface LadderSummaryProps {
  ladder: Ladder;
}

type EnrichedPlayer = ScoreboardProfile & { XP?: number };

const LadderSummary: React.FC<LadderSummaryProps> = ({ ladder }) => {
  const { getUserById, currentUser } = useContext(UserContext);
  const { fetchLadderParticipants } = useContext(LadderContext);
  const [topContenders, setTopContenders] = useState<ScoreboardProfile[]>([]);
  const [participants, setParticipants] = useState<ScoreboardProfile[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [joinVisible, setJoinVisible] = useState(false);

  const isPaid = ladder.entryFee > 0;
  const ladderId = ladder.ladderId;

  useEffect(() => {
    let active = true;
    fetchLadderParticipants(ladderId).then((list) => {
      if (active) setParticipants(list);
    });
    return () => {
      active = false;
    };
  }, [ladderId, fetchLadderParticipants]);

  const { mode, requestJoin } = useLadderJoin(ladder, () =>
    setJoinVisible(true),
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

  const [userSummaryRow, setUserSummaryRow] = useState<{
    player: EnrichedPlayer;
    rank: number;
    cp: number;
  } | null>(null);

  useEffect(() => {
    const uid = currentUser?.userId;
    if (!uid || participants.length === 0) {
      setUserSummaryRow(null);
      return;
    }
    const me = participants.find((p) => p.userId === uid);
    if (!me) {
      setUserSummaryRow(null);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const [enrichedMe] = (await enrichPlayers(getUserById, [
          me,
        ])) as EnrichedPlayer[];
        const rank = getPlayerRankInCompetition(participants, uid);
        const cp = me.XP ?? 0;
        if (active) setUserSummaryRow({ player: enrichedMe, rank, cp });
      } catch (error) {
        console.error("Error building ladder summary row:", error);
        if (active) setUserSummaryRow(null);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [participants, currentUser?.userId, getUserById]);

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
      <LadderStatsRow ladder={ladder} />

      {userSummaryRow && (
        <MySummarySection testID="my-ladder-summary">
          <SectionTitle>Current Position</SectionTitle>
          <MySummaryCard>
            <PerformanceRow
              player={userSummaryRow.player}
              rank={userSummaryRow.rank}
              ladder={ladder}
              cp={userSummaryRow.cp}
            />
          </MySummaryCard>
        </MySummarySection>
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

      {!!ladder.description && (
        <DescriptionSection testID="ladder-description">
          <SectionTitle>About this Ladder</SectionTitle>
          <DescriptionText>{ladder.description}</DescriptionText>
        </DescriptionSection>
      )}

      <View style={{ marginTop: 20 }}>
        <ParticipantCarousel
          participants={participants}
          viewAllText="View All Participants"
          onViewAll={() => {}}
        />
      </View>

      <PhaseTimeline ladder={ladder} />

      {mode === "join" ? (
        <JoinNowButton
          testID="ladder-summary-join"
          activeOpacity={0.85}
          onPress={requestJoin}
        >
          <JoinNowText>Join Now</JoinNowText>
        </JoinNowButton>
      ) : (
        <ParticipantButton
          testID="ladder-summary-join"
          disabled
          activeOpacity={1}
        >
          {mode === "participant" && (
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color="#22c55e"
            />
          )}
          <ParticipantText>
            {mode === "participant" ? "Participant" : "Registration Closed"}
          </ParticipantText>
        </ParticipantButton>
      )}

      <View style={{ height: 40 }} />

      {joinVisible && (
        <JoinLadderModal
          modalVisible={joinVisible}
          setModalVisible={setJoinVisible}
          ladder={ladder}
        />
      )}
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

const JoinNowButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingVertical: 15,
  borderRadius: 12,
  backgroundColor: "#00A2FF",
  marginTop: 20,
});

const JoinNowText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const ParticipantButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingVertical: 15,
  borderRadius: 12,
  backgroundColor: "#16181B",
  borderWidth: 2,
  borderColor: "#272727ff",
  marginTop: 20,
});

const ParticipantText = styled.Text({
  color: "#cbd5e1",
  fontSize: 16,
  fontWeight: "bold",
});

const DescriptionSection = styled.View({
  marginTop: 10,
  gap: 8,
});

const DescriptionText = styled.Text({
  fontSize: 14,
  lineHeight: 20,
  color: "#cccccc",
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

const MySummarySection = styled.View({
  gap: 10,
  marginBottom: 20,
});

const MySummaryCard = styled.View({
  marginHorizontal: -20,
  paddingHorizontal: 20,
});
