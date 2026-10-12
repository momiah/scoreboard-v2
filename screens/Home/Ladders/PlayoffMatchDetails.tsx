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
import PlayoffCoinFlip from "../../../components/ladder/PlayoffCoinFlip";
import ActionPlaceholder from "../../../components/ActionPlaceholder";
import PlayoffMatchScheduleModal from "../../../components/Modals/PlayoffMatchScheduleModal";
import { SkeletonWrapper } from "../../../components/Skeletons/SkeletonComponents";
import { useLadderHomeCourt } from "../../../hooks/useLadderHomeCourt";
import { toMoment } from "../../../helpers/ladderPhases";
import { formatTimeLeft } from "../../../helpers/ladderMatchTime";
import {
  getOpponentSideIds,
  isLadderMatchCalledOff,
} from "../../../helpers/ladderMatchCancellation";

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
    acceptPlayoffMatch,
    flipPlayoffCoin,
  } = useContext(LadderContext);
  const { currentUser } = useContext(UserContext);
  const userId: string | undefined = currentUser?.userId;

  const [ladder, setLadder] = useState<Ladder | null>(
    ladderById?.ladderId === ladderId ? ladderById : null,
  );
  const [ties, setTies] = useState<LadderPlayoffTie[] | null>(null);
  const [matches, setMatches] = useState<LadderMatch[]>([]);
  const [arrangeLeg, setArrangeLeg] = useState<Leg | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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
        <Body>
          <SkeletonWrapper show height={120} width="100%" radius={12} />
          <SkeletonWrapper show height={116} width="100%" radius={10} />
          <SkeletonWrapper show height={116} width="100%" radius={10} />
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

  const handleAccept = async (match: LadderMatch) => {
    if (!userId) return;
    setActionError(null);
    const outcome = await acceptPlayoffMatch({
      ladderId,
      matchId: match.ladderMatchId,
      userId,
    });
    if (!outcome.success)
      setActionError("Couldn't accept this match. Try again.");
  };

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
    if (outcome.success) return null;
    return outcome.reason === "exists"
      ? "This match has already been arranged."
      : "Couldn't arrange this match. Try again.";
  };

  const renderLeg = (leg: Leg) => {
    const match = legs.get(leg);
    const host = tie.coinToss
      ? getLadderPlayoffLegHost(tie.coinToss, leg)
      : null;
    const venue = !host
      ? ""
      : userSide
        ? userSide === host
          ? " · Home"
          : " · Away"
        : ` · ${nameOf(host)} at home`;
    const label = `Match ${leg}${venue}`;

    if (match) {
      const awaitingUser =
        match.matchStatus === LADDER_MATCH_STATUS.POSTED &&
        !!userId &&
        getOpponentSideIds(match, match.createdBy).includes(userId);
      return (
        <LegSection key={leg}>
          <LegLabel>{label}</LegLabel>
          <MatchCard
            match={match}
            onPress={openMatch}
            currentUserId={userId}
            showProgress
            testID={`playoff-match-leg${leg}`}
          />
          {awaitingUser ? (
            <AcceptButton
              activeOpacity={0.85}
              onPress={() => handleAccept(match)}
              testID={`playoff-match-leg${leg}-accept`}
            >
              <AcceptText>Accept</AcceptText>
            </AcceptButton>
          ) : null}
        </LegSection>
      );
    }

    if (!isOpen) {
      return (
        <LegSection key={leg}>
          <LegLabel>{label}</LegLabel>
          <Muted>Not played</Muted>
        </LegSection>
      );
    }

    if (host && userSide === host) {
      return (
        <LegSection key={leg}>
          <LegLabel>{label}</LegLabel>
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
        <LegLabel>{label}</LegLabel>
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
  const coinResultText = (() => {
    if (!toss) return null;
    if (!userSide) return `${nameOf(toss.firstHost)} is at home first`;
    return userSide === toss.firstHost
      ? "You're at home first"
      : "You're away first";
  })();

  const decider = legs.get(3);
  const outcomeLine = (() => {
    if (tie.status !== LADDER_PLAYOFF_TIE_STATUS.COMPLETED) return null;
    if (tie.outcome === LADDER_PLAYOFF_TIE_OUTCOME.VOID || !tie.winner) {
      return "Not played in time, so neither side goes through.";
    }
    if (tie.outcome === LADDER_PLAYOFF_TIE_OUTCOME.WALKOVER) {
      return `${nameOf(tie.winner)} goes through on a walkover.`;
    }
    return `${nameOf(tie.winner)} goes through.`;
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
        <TopTitle numberOfLines={1}>{roundName}</TopTitle>
        <View style={{ width: 24 }} />
      </TopBar>

      <Scroll
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
      >
        {isOpen ? (
          <PlayoffCoinFlip
            face={
              tie.coinToss
                ? (tie.coinToss.face ?? LADDER_PLAYOFF_COIN_FACE.LOGO)
                : null
            }
            call={toss?.call ?? null}
            resultText={coinResultText}
            canFlip={!!userSide}
            onFlip={(call) => flipPlayoffCoin(ladderId, tieId, call)}
          />
        ) : null}

        <ScoreCard testID="playoff-match-aggregate">
          <SideName numberOfLines={2}>{team1Name}</SideName>
          <Aggregate>
            <AggregateText>
              {tally.team1Games} – {tally.team2Games}
            </AggregateText>
            <AggregateLabel>Aggregate</AggregateLabel>
          </Aggregate>
          <SideName numberOfLines={2} style={{ textAlign: "right" }}>
            {team2Name}
          </SideName>
        </ScoreCard>

        <InfoRow>
          <InfoBox testID="playoff-match-format">
            <Ionicons name="trophy-outline" size={18} color="#FFC800" />
            <InfoValue>Best of {tie.bestOf ?? 5}</InfoValue>
            <InfoLabel>per match</InfoLabel>
          </InfoBox>
          {isOpen && deadline?.isValid() ? (
            <InfoBox testID="playoff-match-deadline">
              <Ionicons name="hourglass-outline" size={18} color="#00A2FF" />
              <InfoValue>{formatTimeLeft(deadline.valueOf() - now)}</InfoValue>
              <InfoLabel>to complete both matches</InfoLabel>
            </InfoBox>
          ) : null}
        </InfoRow>
        {outcomeLine ? (
          <Result testID="playoff-match-outcome">{outcomeLine}</Result>
        ) : null}

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

        {actionError ? (
          <ErrorText testID="playoff-match-error">{actionError}</ErrorText>
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
  gap: 12,
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

const ScoreCard = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  padding: 16,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.05)",
});

const SideName = styled.Text({
  flex: 1,
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "600",
});

const Aggregate = styled.View({
  alignItems: "center",
});

const AggregateText = styled.Text({
  color: "#ffffff",
  fontSize: 26,
  fontWeight: "bold",
});

const AggregateLabel = styled.Text({
  color: "#9fb8c8",
  fontSize: 11,
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

const Result = styled.Text({
  color: "#FFC800",
  fontSize: 14,
  fontWeight: "600",
});

const LegSection = styled.View({
  gap: 8,
});

const LegLabel = styled.Text({
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "bold",
});

const AcceptButton = styled.TouchableOpacity({
  height: 36,
  borderRadius: 8,
  backgroundColor: "#00A2FF",
  alignItems: "center",
  justifyContent: "center",
});

const AcceptText = styled.Text({
  color: "#ffffff",
  fontSize: 13,
  fontWeight: "bold",
});

const ErrorText = styled.Text({
  color: "#ff8aa0",
  fontSize: 12,
});
