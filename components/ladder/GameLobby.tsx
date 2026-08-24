import React, { useContext, useEffect, useState } from "react";
import { ScrollView, Linking } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

import { LADDER_MATCH_STATUS, LADDER_TYPE } from "@shared";
import type { LadderMatch, LadderType, Game } from "@shared/types";

import { UserContext } from "../../context/UserContext";
import { GameContext } from "../../context/GameContext";
import { PopupContext } from "../../context/PopupContext";
import MedalDisplay from "../performance/MedalDisplay";
import { FixtureGameItem } from "../Tournaments/Fixtures/FixturesAtoms";
import AddLadderGameModal from "../Modals/AddLadderGameModal";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import { buildCourtMapsUrl } from "../../helpers/courtMapsUrl";
import {
  getLadderMatchScore,
  type LadderMatchOutcome,
} from "../../helpers/ladderMatchProgress";
import { formatMatchDateShort } from "../../helpers/ladderMatchTime";
import { ccDefaultImage } from "../../mockImages/index";

interface ParticipantProfile {
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImage?: string;
  profileDetail?: { XP?: number };
}

interface GameLobbyProps {
  match: LadderMatch;
  ladderType?: LadderType;
  currentUserId?: string;
}

const SCORE_COLORS: Record<LadderMatchOutcome, string> = {
  win: "#00C853",
  loss: "#FF4B6E",
  undecided: "#64748b",
};

const formatLongDate = (matchDate: string): string => {
  const year = (matchDate ?? "").split("-")[2] ?? "";
  const short = formatMatchDateShort(matchDate);
  return year ? `${short} ${year}` : short;
};

const GameLobby: React.FC<GameLobbyProps> = ({
  match,
  ladderType,
  currentUserId,
}) => {
  const { getUserById } = useContext(UserContext);
  const { medalNames } = useContext(GameContext);
  const { showBottomToast } = useContext(PopupContext);

  const [players, setPlayers] = useState<ParticipantProfile[]>([]);
  // Temporary local check-in state — the real check-in system lands later.
  const [checkedIn, setCheckedIn] = useState<Record<string, boolean>>({});
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameModalVisible, setGameModalVisible] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const profiles = await Promise.all(
          match.participants.map((id) => getUserById(id)),
        );
        if (active) {
          setPlayers(
            profiles.filter((p): p is ParticipantProfile => !!p),
          );
        }
      } catch (error) {
        console.error("Error loading match players:", error);
        if (active) setPlayers([]);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [match.participants, getUserById]);

  const toggleCheckIn = (userId: string) =>
    setCheckedIn((prev) => ({ ...prev, [userId]: !prev[userId] }));

  const isCompleted = match.matchStatus === LADDER_MATCH_STATUS.COMPLETED;
  const allCheckedIn =
    players.length > 0 && players.every((p) => checkedIn[p.userId]);
  const gamesLocked = isCompleted || !allCheckedIn;

  const score = getLadderMatchScore(match, currentUserId ?? "");

  const handleGamePress = (game: Game) => {
    if (isCompleted) return;
    if (!allCheckedIn) {
      showBottomToast("All players must check in to start the games", "info");
      return;
    }
    setSelectedGame(game);
    setGameModalVisible(true);
  };

  const courtName = match.court?.courtName ?? "";
  const city = match.court?.location?.city;
  const locationLabel = city ? `${courtName}, ${city}` : courtName;

  const openMap = () =>
    Linking.openURL(buildCourtMapsUrl(match.court)).catch((err) =>
      console.error("Error opening Google Maps:", err),
    );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingVertical: 20, paddingBottom: 40 }}>
        {/* Match details */}
        <Details>
          <LocationRow>
            <Ionicons name="location-outline" size={16} color="#00A2FF" />
            <LocationText numberOfLines={1}>{locationLabel}</LocationText>
            <MapLink onPress={openMap} testID="lobby-map-link" hitSlop={8}>
              <Ionicons name="open-outline" size={16} color="#00A2FF" />
            </MapLink>
          </LocationRow>
          <DetailsGrid>
            <DetailItem>
              <Ionicons name="calendar-outline" size={14} color="#9fb8c8" />
              <DetailText>{formatLongDate(match.matchDate)}</DetailText>
            </DetailItem>
            <DetailItem>
              <Ionicons name="time-outline" size={14} color="#9fb8c8" />
              <DetailText>{match.matchTime?.start}</DetailText>
            </DetailItem>
            <DetailItem>
              <Ionicons name="trophy-outline" size={14} color="#9fb8c8" />
              <DetailText>Best of {match.bestOf}</DetailText>
            </DetailItem>
            <DetailItem>
              <Ionicons name="tennisball-outline" size={14} color="#9fb8c8" />
              <DetailText>{match.shuttleType}</DetailText>
            </DetailItem>
          </DetailsGrid>
        </Details>

        {/* Check-in */}
        <PaddedBlock>
          <BlockTitle>Check-in</BlockTitle>
          {players.length === 0 ? (
            <MutedText>Waiting for an opponent to accept.</MutedText>
          ) : (
            players.map((player) => {
              const xp = player.profileDetail?.XP ?? 0;
              const isIn = !!checkedIn[player.userId];
              return (
                <PlayerRow key={player.userId} testID={`checkin-${player.userId}`}>
                  <Avatar
                    source={
                      player.profileImage
                        ? { uri: player.profileImage }
                        : ccDefaultImage
                    }
                  />
                  <PlayerName numberOfLines={1}>
                    {formatDisplayName(player)}
                  </PlayerName>
                  <CheckChip
                    isIn={isIn}
                    activeOpacity={0.8}
                    onPress={() => toggleCheckIn(player.userId)}
                    testID={`checkin-toggle-${player.userId}`}
                  >
                    <Dot isIn={isIn} />
                    <CheckText isIn={isIn}>
                      {isIn ? "Checked In" : "Not checked In"}
                    </CheckText>
                  </CheckChip>
                  <MedalCol>
                    <MedalDisplay xp={xp} size={34} />
                    <RankName numberOfLines={1}>{medalNames(xp)}</RankName>
                  </MedalCol>
                </PlayerRow>
              );
            })
          )}
        </PaddedBlock>

        {/* Total score + games */}
        <ScoreBar>
          <ScoreLabel>Total score</ScoreLabel>
          <ScoreValue outcome={score.outcome}>
            {score.mine} - {score.theirs}
          </ScoreValue>
        </ScoreBar>

        <GamesHeader>
          <BlockTitle>Games</BlockTitle>
            {isCompleted ? (
              <StatusChip completed testID="lobby-games-completed">
                <Ionicons name="checkmark-circle" size={13} color="#5ef0a6" />
                <StatusChipText completed>Completed</StatusChipText>
              </StatusChip>
            ) : !allCheckedIn ? (
              <StatusChip testID="lobby-games-locked">
                <Ionicons name="lock-closed" size={12} color="#9fb8c8" />
                <StatusChipText>Locked until both check in</StatusChipText>
              </StatusChip>
            ) : null}
          </GamesHeader>

          <GamesList isLocked={gamesLocked}>
            {match.games.map((game) => (
              <FixtureGameItem
                key={game.gameNumber}
                game={game}
                tournamentType={ladderType ?? LADDER_TYPE.SINGLES}
                onPress={handleGamePress}
                innerRef={undefined}
                glowAnim={undefined}
                isHighlighted={false}
                glowColor="#00A2FF"
              />
            ))}
          </GamesList>
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

export default GameLobby;

const Screen = styled.View({
  flex: 1,
});

const Details = styled.View({
  marginHorizontal: 20,
  marginBottom: 20,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderWidth: 1,
  borderColor: "rgb(26, 28, 54)",
  borderRadius: 12,
  padding: 14,
  gap: 12,
});

const LocationRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});

const LocationText = styled.Text({
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "bold",
  flexShrink: 1,
});

const MapLink = styled.TouchableOpacity({
  padding: 2,
});

const DetailsGrid = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  rowGap: 10,
});

const DetailItem = styled.View({
  width: "50%",
  flexDirection: "row",
  alignItems: "center",
  gap: 7,
});

const DetailText = styled.Text({
  color: "#cbd5e1",
  fontSize: 13,
});

const PaddedBlock = styled.View({
  marginHorizontal: 20,
  marginBottom: 20,
  gap: 12,
});

const BlockTitle = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const MutedText = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
});

const PlayerRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  backgroundColor: "rgb(3, 16, 31)",
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
});

const Avatar = styled.Image({
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: "rgb(9, 33, 62)",
});

const PlayerName = styled.Text({
  flex: 1,
  minWidth: 0,
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "bold",
});

const CheckChip = styled.TouchableOpacity<{ isIn: boolean }>(
  ({ isIn }: { isIn: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: isIn ? "#0c3d24" : "#3d2c07",
  }),
);

const CheckText = styled.Text<{ isIn: boolean }>(
  ({ isIn }: { isIn: boolean }) => ({
    color: isIn ? "#5ef0a6" : "#ffc266",
    fontSize: 11,
    fontWeight: "700",
  }),
);

const Dot = styled.View<{ isIn: boolean }>(({ isIn }: { isIn: boolean }) => ({
  width: 9,
  height: 9,
  borderRadius: 5,
  backgroundColor: isIn ? "#00C853" : "#FFA500",
  shadowColor: isIn ? "#00C853" : "#FFA500",
  shadowOpacity: 0.9,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 0 },
  elevation: 4,
}));

const MedalCol = styled.View({
  width: 46,
  alignItems: "center",
});

const RankName = styled.Text({
  color: "#ffffff",
  fontSize: 10,
  fontWeight: "600",
  marginTop: 4,
  textAlign: "center",
});

const ScoreBar = styled.View({
  marginHorizontal: 20,
  marginBottom: 16,
  backgroundColor: "rgba(0, 162, 255, 0.08)",
  borderWidth: 1,
  borderColor: "rgb(26, 28, 54)",
  borderRadius: 12,
  paddingVertical: 12,
  alignItems: "center",
});

const ScoreLabel = styled.Text({
  color: "#9fb8c8",
  fontSize: 11,
  fontWeight: "600",
  letterSpacing: 0.6,
  textTransform: "uppercase",
});

const ScoreValue = styled.Text<{ outcome: LadderMatchOutcome }>(
  ({ outcome }: { outcome: LadderMatchOutcome }) => ({
    color: SCORE_COLORS[outcome],
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  }),
);

const GamesHeader = styled.View({
  marginHorizontal: 20,
  marginBottom: 12,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
});

const StatusChip = styled.View<{ completed?: boolean }>(
  ({ completed }: { completed?: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: completed ? "#0c3d24" : "rgba(255, 255, 255, 0.06)",
  }),
);

const StatusChipText = styled.Text<{ completed?: boolean }>(
  ({ completed }: { completed?: boolean }) => ({
    color: completed ? "#5ef0a6" : "#9fb8c8",
    fontSize: 11,
    fontWeight: "600",
  }),
);

const GamesList = styled.View<{ isLocked: boolean }>(
  ({ isLocked }: { isLocked: boolean }) => ({
    opacity: isLocked ? 0.5 : 1,
  }),
);
