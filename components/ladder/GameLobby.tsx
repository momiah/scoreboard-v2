import React, { useContext, useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

import {
  hasUserCheckedIn,
  LADDER_MATCH_STATUS,
  LADDER_TYPE,
  COMPETITION_TYPES,
} from "@shared";
import type { LadderMatch, Game, Player } from "@shared/types";

import { UserContext } from "../../context/UserContext";
import { PopupContext } from "../../context/PopupContext";
import MedalDisplay from "../performance/MedalDisplay";
import { FixtureGameItem } from "../Tournaments/Fixtures/FixturesAtoms";
import AddTournamentGameModal from "../Modals/AddTournamentGameModal";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import {
  getLadderMatchScore,
  type LadderMatchOutcome,
} from "../../helpers/ladderMatchProgress";
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
  ladderId: string;
  match: LadderMatch;
  currentUserId?: string;
  checkedIn: boolean;
}

const SCORE_COLORS: Record<LadderMatchOutcome, string> = {
  win: "#19a800ff",
  loss: "#FF4B6E",
  undecided: "#64748b",
};

const GameLobby: React.FC<GameLobbyProps> = ({
  ladderId,
  match,
  currentUserId,
  checkedIn,
}) => {
  const { getUserById, currentUser } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const [players, setPlayers] = useState<ParticipantProfile[]>([]);
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
          setPlayers(profiles.filter((p): p is ParticipantProfile => !!p));
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

  const isCompleted = match.matchStatus === LADDER_MATCH_STATUS.COMPLETED;
  const allCheckedIn = players.length > 0 && checkedIn;
  const gamesLocked = isCompleted || !allCheckedIn;

  const score = getLadderMatchScore(match, currentUserId ?? "");

  const mine = players.find((p) => p.userId === currentUserId);
  const opponents = players.filter((p) => p.userId !== currentUserId);
  const leftNames = mine ? [formatDisplayName(mine)] : ["You"];
  const rightNames =
    opponents.length > 0
      ? opponents.map((p) => formatDisplayName(p))
      : ["Opponent"];

  const isDoubles = match.participants.length > 2;

  const toPlayerCell = (p?: ParticipantProfile): Player | null =>
    p
      ? {
          userId: p.userId,
          firstName: p.firstName ?? "",
          lastName: p.lastName ?? "",
          username: p.username ?? "",
          displayName: formatDisplayName(p),
        }
      : null;

  const gamesWithPlayers: Game[] = match.games.map((game) => {
    if (game.team1?.player1 || game.team2?.player1) return game;
    return {
      ...game,
      team1: {
        ...game.team1,
        player1: toPlayerCell(mine),
        player2: null,
      },
      team2: {
        ...game.team2,
        player1: toPlayerCell(opponents[0]),
        player2: isDoubles ? toPlayerCell(opponents[1]) : null,
      },
    };
  });

  const handleGamePress = (game: Game) => {
    if (!allCheckedIn && !isCompleted) {
      showBottomToast("All players must check in to start the games", "info");
      return;
    }

    // A reported game (score submitted) opens the shared GameScreen to
    // view/approve/watch, exactly like League/Tournament. An unreported shell
    // opens the report modal so a player can submit the score.
    const isReported =
      !!game.result || (game.approvalStatus ?? "") !== "";

    if (isReported) {
      navigation.navigate("GameScreen", {
        gameId: game.gameId,
        competitionId: ladderId,
        competitionType: COMPETITION_TYPES.LADDER,
        competitionName: match.court?.courtName ?? "Ladder match",
        gamescore: game.gamescore ?? "",
        date: game.date ?? "",
        team1: game.team1,
        team2: game.team2,
        ladderId,
        matchId: match.ladderMatchId,
      });
      return;
    }

    if (isCompleted) return;

    setSelectedGame(game);
    setGameModalVisible(true);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 40 }}
      >
        <PaddedBlock>
          <CheckinHeader>
            <BlockTitle>Check-in</BlockTitle>
          </CheckinHeader>

          {players.length === 0 ? (
            <MutedText>Waiting for an opponent to accept.</MutedText>
          ) : (
            <PlayerList>
              {players.map((player) => {
                const xp = player.profileDetail?.XP ?? 0;
                const isCheckedIn =
                  isCompleted || hasUserCheckedIn(match, player.userId);
                return (
                  <PlayerRow
                    key={player.userId}
                    activeOpacity={0.7}
                    testID={`checkin-${player.userId}`}
                  >
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
                    <StatusBadge isCheckedIn={isCheckedIn}>
                      <Dot isCheckedIn={isCheckedIn} />
                      <CheckText isCheckedIn={isCheckedIn}>
                        {isCheckedIn ? "Checked In" : "Not checked In"}
                      </CheckText>
                    </StatusBadge>
                    <MedalDisplay xp={xp} size={42} />
                  </PlayerRow>
                );
              })}
            </PlayerList>
          )}
        </PaddedBlock>

        <ScoreBar>
          <ScoreLabel>Total score</ScoreLabel>
          <ScoreRow>
            <SideCol>
              {leftNames.map((name, i) => (
                <SideName key={`${i}-${name}`} numberOfLines={1}>
                  {name}
                </SideName>
              ))}
            </SideCol>
            <ScoreValue outcome={score.outcome}>
              {score.mine} - {score.theirs}
            </ScoreValue>
            <SideCol align="right">
              {rightNames.map((name, i) => (
                <SideName key={`${i}-${name}`} numberOfLines={1} align="right">
                  {name}
                </SideName>
              ))}
            </SideCol>
          </ScoreRow>
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
              <StatusChipText>Locked until all players check in</StatusChipText>
            </StatusChip>
          ) : null}
        </GamesHeader>

        <GamesList isLocked={gamesLocked}>
          {gamesWithPlayers.map((game) => (
            <FixtureGameItem
              key={game.gameNumber}
              game={game}
              tournamentType={
                isDoubles ? LADDER_TYPE.DOUBLES : LADDER_TYPE.SINGLES
              }
              onPress={handleGamePress}
              innerRef={undefined}
              glowAnim={undefined}
              isHighlighted={false}
              glowColor="#00A2FF"
            />
          ))}
        </GamesList>
      </ScrollView>

      <AddTournamentGameModal
        visible={gameModalVisible}
        game={selectedGame}
        tournamentType={isDoubles ? LADDER_TYPE.DOUBLES : LADDER_TYPE.SINGLES}
        currentUser={currentUser ?? null}
        tournamentName={match.court?.courtName ?? "Ladder match"}
        tournamentId=""
        ladder={{
          ladderId,
          matchId: match.ladderMatchId,
          name: match.court?.courtName ?? "Ladder match",
        }}
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

const PaddedBlock = styled.View({
  marginHorizontal: 20,
  marginBottom: 20,
  gap: 12,
});

const CheckinHeader = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
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

const PlayerList = styled.View({});

const PlayerRow = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: "rgb(9, 33, 62)",
  borderTopWidth: 1,
  borderTopColor: "rgb(9, 33, 62)",
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

const StatusBadge = styled.View<{ isCheckedIn: boolean }>(
  ({ isCheckedIn }: { isCheckedIn: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: isCheckedIn ? "#0c3d24" : "#3d2c07",
  }),
);

const CheckText = styled.Text<{ isCheckedIn: boolean }>(
  ({ isCheckedIn }: { isCheckedIn: boolean }) => ({
    color: isCheckedIn ? "#5ef0a6" : "#ffc266",
    fontSize: 9,
    fontWeight: "700",
  }),
);

const Dot = styled.View<{ isCheckedIn: boolean }>(
  ({ isCheckedIn }: { isCheckedIn: boolean }) => ({
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: isCheckedIn ? "#00C853" : "#FFA500",
    shadowColor: isCheckedIn ? "#00C853" : "#FFA500",
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  }),
);

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

const ScoreRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "stretch",
  paddingHorizontal: 14,
  marginTop: 6,
});

const SideCol = styled.View<{ align?: "left" | "right" }>(
  ({ align }: { align?: "left" | "right" }) => ({
    flex: 1,
    gap: 2,
    alignItems: align === "right" ? "flex-end" : "flex-start",
  }),
);

const SideName = styled.Text<{ align?: "left" | "right" }>(
  ({ align }: { align?: "left" | "right" }) => ({
    maxWidth: "100%",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: align === "right" ? "right" : "left",
  }),
);

const ScoreValue = styled.Text<{ outcome: LadderMatchOutcome }>(
  ({ outcome }: { outcome: LadderMatchOutcome }) => ({
    color: SCORE_COLORS[outcome],
    fontSize: 32,
    fontWeight: "bold",
    marginHorizontal: 12,
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
