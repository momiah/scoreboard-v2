import React, { useContext, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";

import {
  LADDER_MATCH_STATUS,
  LADDER_PLAYOFF_TIE_OUTCOME,
  LADDER_PLAYOFF_COIN_FACE,
  LADDER_PLAYOFF_TIE_STATUS,
} from "@shared";
import {
  getLadderPlayoffLegHost,
  roundLabel,
  tallyLadderPlayoffTie,
} from "@shared/helpers";
import type {
  Court,
  GameTeam,
  Ladder,
  LadderMatch,
  LadderPlayoffTie,
  LadderPlayoffTieSide,
} from "@shared/types";
import { LadderContext } from "../../../context/LadderContext";
import { UserContext } from "../../../context/UserContext";
import MatchCard from "../../../components/ladder/MatchCard";
import MatchScoreBar from "../../../components/ladder/MatchScoreBar";
import PlayoffCoinFlip from "../../../components/ladder/PlayoffCoinFlip";
import ActionPlaceholder from "../../../components/ActionPlaceholder";
import PlayoffMatchScheduleModal from "../../../components/Modals/PlayoffMatchScheduleModal";
import {
  CircleSkeleton,
  SkeletonWrapper,
  TextSkeleton,
} from "../../../components/Skeletons/SkeletonComponents";
import { useLadderHomeCourt } from "../../../hooks/useLadderHomeCourt";
import { usePlayoffMatchScheduling } from "../../../hooks/usePlayoffMatchScheduling";
import { toMoment } from "../../../helpers/ladderPhases";
import { formatTimeLeft } from "../../../helpers/ladderMatchTime";
import { isLadderMatchCalledOff } from "../../../helpers/ladderMatchCancellation";

interface PlayoffMatchDetailsParams {
  ladderId: string;
  tieId: string;
}

type Leg = 1 | 2;

const teamName = (team: GameTeam): string =>
  [team.player1, team.player2]
    .filter(Boolean)
    .map((player) => player?.displayName || player?.firstName || "TBD")
    .join(" & ") || "TBD";

const sideOfUser = (
  tie: LadderPlayoffTie,
  userId: string | undefined,
): LadderPlayoffTieSide | null => {
  if (!userId) return null;
  if (tie.side1?.playerIds.includes(userId)) return "team1";
  if (tie.side2?.playerIds.includes(userId)) return "team2";
  return null;
};

const PlayoffMatchDetails: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, PlayoffMatchDetailsParams>, string>>();
  const { ladderId, tieId } = route.params;
  const {
    ladderById,
    fetchLadderById,
    subscribeToLadderPlayoffTies,
    subscribeToPlayoffMatches,
    arrangePlayoffMatch,
    flipPlayoffCoin,
  } = useContext(LadderContext);
  const { currentUser } = useContext(UserContext);
  const userId: string | undefined = currentUser?.userId;
  const { notifyArranged } = usePlayoffMatchScheduling();

  const [ladder, setLadder] = useState<Ladder | null>(
    ladderById?.ladderId === ladderId ? ladderById : null,
  );
  const [ties, setTies] = useState<LadderPlayoffTie[] | null>(null);
  const [matches, setMatches] = useState<LadderMatch[]>([]);
  const [arrangeLeg, setArrangeLeg] = useState<Leg | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (ladder) return;
    fetchLadderById(ladderId).then((loaded: Ladder | null) =>
      setLadder(loaded),
    );
  }, [ladder, ladderId, fetchLadderById]);

  useEffect(
    () => subscribeToLadderPlayoffTies(ladderId, setTies, () => setTies([])),
    [ladderId, subscribeToLadderPlayoffTies],
  );
  useEffect(
    () =>
      subscribeToPlayoffMatches(ladderId, tieId, setMatches, () =>
        setMatches([]),
      ),
    [ladderId, tieId, subscribeToPlayoffMatches],
  );

  const homeCourtState = useLadderHomeCourt(ladder);

  const tie = useMemo(
    () => ties?.find((candidate) => candidate.tieId === tieId) ?? null,
    [ties, tieId],
  );
  const totalRounds = useMemo(
    () =>
      Math.max(
        1,
        ...(ties ?? [])
          .filter((candidate) => !candidate.isThirdPlacePlayoff)
          .map((candidate) => candidate.round),
      ),
    [ties],
  );
  const legs = useMemo(() => {
    const byLeg = new Map<number, LadderMatch>();
    matches.forEach((match) => {
      if (match.playoffLeg && !isLadderMatchCalledOff(match)) {
        byLeg.set(match.playoffLeg, match);
      }
    });
    return byLeg;
  }, [matches]);

  if (!tie || !ladder) {
    return (
      <Screen testID="playoff-match-loading">
        <TopBar>
          <BackButton
            onPress={() => navigation.goBack()}
            testID="playoff-match-back"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </BackButton>
          <TextSkeleton show width={160} height={20} />
          <View style={{ width: 24 }} />
        </TopBar>
        <Body>
          <View style={{ alignItems: "center", gap: 10, paddingTop: 16 }}>
            <CircleSkeleton show size={96} />
            <TextSkeleton show width={220} height={14} />
            <View style={{ flexDirection: "row", gap: 32 }}>
              <CircleSkeleton show size={48} />
              <CircleSkeleton show size={48} />
            </View>
          </View>
          <SkeletonWrapper show height={84} width="100%" radius={12} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <SkeletonWrapper show height={88} width="100%" radius={12} />
            </View>
            <View style={{ flex: 1 }}>
              <SkeletonWrapper show height={88} width="100%" radius={12} />
            </View>
          </View>
          {[1, 2].map((leg) => (
            <View key={leg} style={{ gap: 8 }}>
              <TextSkeleton show width={140} height={16} />
              <SkeletonWrapper show height={110} width="100%" radius={10} />
            </View>
          ))}
        </Body>
      </Screen>
    );
  }

  const userSide = sideOfUser(tie, userId);
  const roundName = tie.isThirdPlacePlayoff
    ? "3rd-place game"
    : roundLabel(2 ** (totalRounds - tie.round + 1));
  const tally = tallyLadderPlayoffTie(tie, [...legs.values()]);
  const isOpen = tie.status === LADDER_PLAYOFF_TIE_STATUS.SCHEDULED;
  const isCompleted = tie.status === LADDER_PLAYOFF_TIE_STATUS.COMPLETED;
  const completedOn = tie.completedAt
    ? toMoment(tie.completedAt)?.format("ddd D MMM")
    : null;
  const team1Name = teamName(tie.team1);
  const team2Name = teamName(tie.team2);
  const nameOf = (side: LadderPlayoffTieSide) =>
    side === "team1" ? team1Name : team2Name;
  const deadline = tie.deadlineAt ? toMoment(tie.deadlineAt) : null;

  const openMatch = (match: LadderMatch) =>
    navigation.navigate("MatchDetails", {
      ladderId,
      matchId: match.ladderMatchId,
      match,
      ladderType: ladder.ladderType,
      ladderName: ladder.name,
    });

  const arrange = async (
    leg: Leg,
    host: LadderPlayoffTieSide,
    input: Parameters<typeof arrangePlayoffMatch>[0]["input"],
  ): Promise<string | null> => {
    if (!userId) return "Sign in to arrange this match.";
    const outcome = await arrangePlayoffMatch({
      ladder,
      tie,
      leg,
      host,
      input,
      userId,
    });
    if (outcome.success) {
      const previous = matches.find(
        (candidate) => candidate.playoffLeg === leg,
      );
      await notifyArranged({
        ladderId,
        match: {
          ...(previous ?? {}),
          ...input,
          ladderMatchId: `${tie.tieId}-leg${leg}`,
          playoffTieId: tie.tieId,
          playoffLeg: leg,
          matchStatus: LADDER_MATCH_STATUS.POSTED,
          scheduleDeclines: previous?.scheduleDeclines ?? 0,
        } as LadderMatch,
        opponentIds: tie[host === "team1" ? "side2" : "side1"]?.playerIds ?? [],
      });
      return null;
    }
    return outcome.reason === "exists"
      ? "This match has already been arranged."
      : "Couldn't arrange this match. Try again.";
  };

  const renderLeg = (leg: Leg) => {
    const match = legs.get(leg);
    const host = tie.coinToss
      ? getLadderPlayoffLegHost(tie.coinToss, leg)
      : null;
    const label = (
      <LegHeader>
        <LegLabel>Match {leg}</LegLabel>
        {host ? (
          <HostTag testID={`playoff-match-leg${leg}-host`}>
            <Ionicons name="home" size={13} color="#9fb8c8" />
            <HostName numberOfLines={1}>{nameOf(host)}</HostName>
          </HostTag>
        ) : null}
      </LegHeader>
    );

    if (match) {
      return (
        <LegSection key={leg}>
          {label}
          <MatchCard
            match={match}
            onPress={openMatch}
            currentUserId={userId}
            showProgress
            showBestOf={false}
            testID={`playoff-match-leg${leg}`}
          />
        </LegSection>
      );
    }

    if (!isOpen) {
      return (
        <LegSection key={leg}>
          {label}
          <ActionPlaceholder
            message={
              isCompleted ? "Not played" : "Arranged after the coin toss"
            }
            icon={isCompleted ? "remove-circle-outline" : "time-outline"}
            height={110}
            onPress={() => {}}
            disabled
            accentColor="#5b7083"
            testID={`playoff-match-leg${leg}-closed`}
          />
        </LegSection>
      );
    }

    if (host && userSide === host) {
      return (
        <LegSection key={leg}>
          {label}
          <ActionPlaceholder
            message="Arrange your home match"
            icon="calendar-outline"
            height={110}
            onPress={() => setArrangeLeg(leg)}
            testID={`playoff-match-leg${leg}-arrange`}
          />
        </LegSection>
      );
    }

    const waitingFor = !host
      ? "Arranged after the coin toss"
      : userSide
        ? "Waiting for your opponent to arrange their home match"
        : `Waiting for ${nameOf(host)} to arrange their home match`;
    return (
      <LegSection key={leg}>
        {label}
        <ActionPlaceholder
          message={waitingFor}
          icon="time-outline"
          height={110}
          onPress={() => {}}
          disabled
          accentColor="#5b7083"
          testID={`playoff-match-leg${leg}-waiting`}
        />
      </LegSection>
    );
  };

  const toss = tie.coinToss;
  const callerSide: LadderPlayoffTieSide | null = toss
    ? tie.side1?.playerIds.includes(toss.flippedBy)
      ? "team1"
      : "team2"
    : userSide;
  const callerName = callerSide ? nameOf(callerSide) : null;

  const decider = legs.get(3);
  const outcome = (() => {
    if (!isCompleted) return null;
    if (tie.outcome === LADDER_PLAYOFF_TIE_OUTCOME.VOID || !tie.winner) {
      return {
        winner: null,
        detail: "Not played in time, so neither side goes through.",
      };
    }
    const isFinal = !tie.isThirdPlacePlayoff && tie.round >= totalRounds;
    const destination = tie.isThirdPlacePlayoff
      ? "Takes 3rd place"
      : isFinal
        ? "Ladder champion"
        : `Through to the ${roundLabel(2 ** (totalRounds - tie.round))}`;
    return {
      winner: nameOf(tie.winner),
      detail:
        tie.outcome === LADDER_PLAYOFF_TIE_OUTCOME.WALKOVER
          ? `${destination} on a walkover`
          : destination,
    };
  })();

  const arrangeHost =
    arrangeLeg && tie.coinToss
      ? getLadderPlayoffLegHost(tie.coinToss, arrangeLeg)
      : null;
  const homeCourt: Court | null = homeCourtState.homeCourt
    ? (homeCourtState.homeCourt as unknown as Court)
    : null;

  return (
    <Screen testID="playoff-match-details">
      <TopBar>
        <BackButton
          onPress={() => navigation.goBack()}
          testID="playoff-match-back"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </BackButton>
        <TopTitle numberOfLines={1}>
          {tie.gameNumber ? `${roundName} · Game ${tie.gameNumber}` : roundName}
        </TopTitle>
        <View style={{ width: 24 }} />
      </TopBar>

      <Scroll
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
      >
        <PlayoffCoinFlip
          face={
            tie.coinToss
              ? (tie.coinToss.face ?? LADDER_PLAYOFF_COIN_FACE.LOGO)
              : null
          }
          call={toss?.call ?? null}
          callerName={callerName}
          canFlip={!!userSide && isOpen}
          idleText={
            isCompleted
              ? ""
              : !isOpen
                ? "The coin toss opens once both players are known"
                : undefined
          }
          onFlip={(call) => flipPlayoffCoin(ladderId, tieId, call)}
        />

        {outcome ? (
          outcome.winner ? (
            <WinnerCard testID="playoff-match-outcome">
              <Ionicons name="trophy" size={28} color="#FFC800" />
              <WinnerText>
                <WinnerLabel>Winner</WinnerLabel>
                <WinnerName numberOfLines={1}>{outcome.winner}</WinnerName>
                <WinnerDetail>{outcome.detail}</WinnerDetail>
              </WinnerText>
            </WinnerCard>
          ) : (
            <VoidCard testID="playoff-match-outcome">
              <Ionicons
                name="remove-circle-outline"
                size={20}
                color="#9fb8c8"
              />
              <VoidText>{outcome.detail}</VoidText>
            </VoidCard>
          )
        ) : null}

        <MatchScoreBar
          label="Aggregate"
          leftNames={[team1Name]}
          rightNames={[team2Name]}
          leftScore={tally.team1Games}
          rightScore={tally.team2Games}
          outcome={
            userSide && tie.winner
              ? tie.winner === userSide
                ? "win"
                : "loss"
              : "undecided"
          }
          testID="playoff-match-aggregate"
        />

        <InfoRow>
          <InfoBox testID="playoff-match-format">
            <Ionicons name="trophy-outline" size={18} color="#FFC800" />
            <InfoValue>Best of {tie.bestOf ?? 5}</InfoValue>
            <InfoLabel>per match</InfoLabel>
          </InfoBox>
          <InfoBox testID="playoff-match-deadline">
            <Ionicons name="hourglass-outline" size={18} color="#00A2FF" />
            <InfoValue>
              {isCompleted
                ? "Finished"
                : isOpen && deadline?.isValid()
                  ? formatTimeLeft(deadline.valueOf() - now)
                  : "10 days"}
            </InfoValue>
            <InfoLabel>
              {isCompleted
                ? completedOn
                  ? `on ${completedOn}`
                  : "playoff game over"
                : isOpen
                  ? "to complete both matches"
                  : "to play both matches once it starts"}
            </InfoLabel>
          </InfoBox>
        </InfoRow>

        {renderLeg(1)}
        {renderLeg(2)}

        {decider ? (
          <LegSection>
            <LegLabel>Deciding game</LegLabel>
            <Muted>Level on aggregate. One deciding game to play.</Muted>
            <MatchCard
              match={decider}
              onPress={openMatch}
              currentUserId={userId}
              showProgress
              testID="playoff-match-decider"
            />
          </LegSection>
        ) : null}
      </Scroll>

      {arrangeLeg && arrangeHost ? (
        <PlayoffMatchScheduleModal
          visible
          onClose={() => setArrangeLeg(null)}
          ladder={ladder}
          title={`Arrange match ${arrangeLeg}`}
          bestOf={tie.bestOf ?? 5}
          deadline={deadline?.toDate() ?? null}
          defaultCourt={homeCourt}
          onSubmit={(input) => arrange(arrangeLeg, arrangeHost, input)}
        />
      ) : null}
    </Screen>
  );
};

export default PlayoffMatchDetails;

const Screen = styled.View({
  flex: 1,
  backgroundColor: "#00152B",
});

const Body = styled.View({
  padding: 20,
  gap: 16,
});

const TopBar = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 20,
  paddingTop: 20,
});

const BackButton = styled.TouchableOpacity({});

const TopTitle = styled.Text({
  color: "#ffffff",
  fontSize: 18,
  fontWeight: "bold",
});

const Scroll = styled.ScrollView({
  flex: 1,
});

const InfoRow = styled.View({
  flexDirection: "row",
  gap: 12,
});

const InfoBox = styled.View({
  flex: 1,
  alignItems: "center",
  gap: 4,
  paddingVertical: 12,
  paddingHorizontal: 8,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.05)",
});

const InfoValue = styled.Text({
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "bold",
  textAlign: "center",
});

const InfoLabel = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
  textAlign: "center",
});

const Muted = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
});

const WinnerCard = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
  padding: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "rgba(255, 200, 0, 0.6)",
  backgroundColor: "rgba(255, 200, 0, 0.1)",
});

const WinnerText = styled.View({
  flex: 1,
  gap: 2,
});

const WinnerLabel = styled.Text({
  color: "#FFC800",
  fontSize: 11,
  fontWeight: "700",
  letterSpacing: 0.6,
  textTransform: "uppercase",
});

const WinnerName = styled.Text({
  color: "#ffffff",
  fontSize: 20,
  fontWeight: "bold",
});

const WinnerDetail = styled.Text({
  color: "#e6d28a",
  fontSize: 13,
});

const VoidCard = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  padding: 14,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.05)",
});

const VoidText = styled.Text({
  flex: 1,
  color: "#cbd5e1",
  fontSize: 13,
});

const LegSection = styled.View({
  gap: 8,
});

const LegHeader = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
});

const HostTag = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  flexShrink: 1,
});

const HostName = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  flexShrink: 1,
});

const LegLabel = styled.Text({
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "bold",
});
