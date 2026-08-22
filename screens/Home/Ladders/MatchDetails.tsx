import React, { useCallback, useContext, useState } from "react";
import { ScrollView, View } from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

import { LADDER_TYPE } from "@shared/types";
import type { Game, LadderMatch, LadderType } from "@shared/types";

import { UserContext } from "../../../context/UserContext";
import { LadderContext } from "../../../context/LadderContext";
import { PopupContext } from "../../../context/PopupContext";
import MatchCard from "../../../components/ladder/MatchCard";
import { FixtureGameItem } from "../../../components/Tournaments/Fixtures/FixturesAtoms";
import { useFixturesScrollToGame } from "../../../components/Tournaments/Fixtures/useFixturesScrollToGame";
import AddLadderGameModal from "../../../components/Modals/AddLadderGameModal";
import {
  isMatchStarted,
  formatMatchDateShort,
} from "../../../helpers/ladderMatchTime";
import { ccDefaultImage } from "../../../mockImages/index";

interface MatchDetailsParams {
  ladderId: string;
  matchId: string;
  match?: LadderMatch;
  ladderType?: LadderType;
  scrollToGameId?: string;
  glowColor?: string;
}

interface OpponentProfile {
  userId?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImage?: string;
}

const opponentName = (opponent: OpponentProfile): string => {
  const full = [opponent.firstName, opponent.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return full || opponent.username || "Unknown player";
};

const MatchDetails: React.FC = () => {
  const route =
    useRoute<RouteProp<Record<string, MatchDetailsParams>, string>>();
  const {
    ladderId,
    matchId,
    match: matchParam,
    ladderType,
    scrollToGameId,
    glowColor,
  } = route.params;

  const { currentUser, getUserById } = useContext(UserContext);
  const { fetchLadderMatches } = useContext(LadderContext);
  const { showBottomToast } = useContext(PopupContext);
  const { scrollRef, gameRefs, highlightedGameId, glowAnim } =
    useFixturesScrollToGame(scrollToGameId);

  const [match, setMatch] = useState<LadderMatch | null>(matchParam ?? null);
  const [opponents, setOpponents] = useState<OpponentProfile[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameModalVisible, setGameModalVisible] = useState(false);

  const userId = currentUser?.userId;
  const isDoubles = ladderType === LADDER_TYPE.DOUBLES;

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        let resolved = matchParam ?? null;
        if (!resolved) {
          try {
            const all = await fetchLadderMatches(ladderId);
            resolved = all.find((m) => m.ladderMatchId === matchId) ?? null;
          } catch (error) {
            console.error("Error loading match details:", error);
          }
        }
        if (active) setMatch(resolved);

        if (!resolved) {
          if (active) setOpponents([]);
          return;
        }

        const otherIds = resolved.participants.filter((id) => id !== userId);
        try {
          const profiles = await Promise.all(
            otherIds.map((id) => getUserById(id)),
          );
          if (active) {
            setOpponents(
              profiles.filter(
                (profile): profile is OpponentProfile => !!profile,
              ),
            );
          }
        } catch (error) {
          console.error("Error loading opponents:", error);
          if (active) setOpponents([]);
        }
      };

      load();
      return () => {
        active = false;
      };
    }, [ladderId, matchId, matchParam, userId, fetchLadderMatches, getUserById]),
  );

  const started = match ? isMatchStarted(match) : false;

  const handleGamePress = (game: Game) => {
    if (!match) return;
    if (!started) {
      showBottomToast(
        `This match starts ${formatMatchDateShort(match.matchDate)} at ${match.matchTime?.start}`,
        "info",
      );
      return;
    }
    setSelectedGame(game);
    setGameModalVisible(true);
  };

  if (!match) {
    return (
      <Screen>
        <NotFound testID="match-details-not-found">
          <NotFoundText>Match not found.</NotFoundText>
        </NotFound>
      </Screen>
    );
  }

  return (
    <Screen testID="match-details">
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 40 }}>
        <Section>
          <SectionTitle>
            {isDoubles ? "Your opponents" : "Your opponent"}
          </SectionTitle>
          {opponents.length === 0 ? (
            <MutedText testID="match-details-opponent-pending">
              Waiting for an opponent to accept.
            </MutedText>
          ) : (
            <OpponentRow testID="match-details-opponents">
              {opponents.map((opponent, index) => (
                <OpponentCard key={opponent.userId ?? index}>
                  <OpponentAvatar
                    source={
                      opponent.profileImage
                        ? { uri: opponent.profileImage }
                        : ccDefaultImage
                    }
                  />
                  <OpponentName numberOfLines={1}>
                    {opponentName(opponent)}
                  </OpponentName>
                </OpponentCard>
              ))}
            </OpponentRow>
          )}
        </Section>

        <Section>
          <SectionTitle>Match details</SectionTitle>
          <MatchCard match={match} testID="match-details-card" showProgress />
        </Section>

        <GamesSection>
          <GamesHeader>
            <GamesTitle>Games</GamesTitle>
            {!started && (
              <LockChip testID="match-details-games-locked">
                <Ionicons name="lock-closed" size={12} color="#9fb8c8" />
                <LockChipText>
                  Unlocks {formatMatchDateShort(match.matchDate)} ·{" "}
                  {match.matchTime?.start}
                </LockChipText>
              </LockChip>
            )}
          </GamesHeader>
          <GamesList isLocked={!started}>
            {match.games.map((game) => {
              const gameKey = String(game.gameNumber);
              return (
                <FixtureGameItem
                  key={gameKey}
                  game={game}
                  tournamentType={ladderType ?? LADDER_TYPE.SINGLES}
                  onPress={handleGamePress}
                  innerRef={(node: View | null) => {
                    if (node) gameRefs.current[gameKey] = node;
                  }}
                  glowAnim={glowAnim}
                  isHighlighted={gameKey === highlightedGameId}
                  glowColor={glowColor ?? "#00A2FF"}
                />
              );
            })}
          </GamesList>
        </GamesSection>
      </ScrollView>

      <AddLadderGameModal
        visible={gameModalVisible}
        game={selectedGame}
        onClose={() => {
          setGameModalVisible(false);
          setSelectedGame(null);
        }}
      />
    </Screen>
  );
};

export default MatchDetails;

const Screen = styled.View({
  flex: 1,
  backgroundColor: "#00152B",
});

const Section = styled.View({
  paddingHorizontal: 20,
  paddingTop: 20,
  gap: 12,
});

const SectionTitle = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const GamesSection = styled.View({
  paddingTop: 20,
});

const GamesHeader = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginHorizontal: 20,
  marginBottom: 12,
});

const GamesTitle = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const LockChip = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 8,
  backgroundColor: "rgba(255, 255, 255, 0.06)",
});

const LockChipText = styled.Text({
  color: "#9fb8c8",
  fontSize: 11,
  fontWeight: "600",
});

const GamesList = styled.View<{ isLocked: boolean }>(
  ({ isLocked }: { isLocked: boolean }) => ({
    opacity: isLocked ? 0.5 : 1,
  }),
);

const OpponentRow = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 12,
});

const OpponentCard = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderRadius: 10,
  backgroundColor: "rgb(3, 16, 31)",
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
});

const OpponentAvatar = styled.Image({
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgb(9, 33, 62)",
});

const OpponentName = styled.Text({
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "bold",
  maxWidth: 180,
});

const MutedText = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
});

const NotFound = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const NotFoundText = styled.Text({
  color: "#9fb8c8",
});
