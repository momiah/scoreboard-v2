import React, { useContext, useEffect, useState } from "react";
import {
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
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
import type {
  LadderMatch,
  Game,
  GameTeam,
  Player,
  ScoreboardProfile,
  TeamStats,
} from "@shared/types";

import { UserContext } from "../../context/UserContext";
import { LadderContext } from "../../context/LadderContext";
import { GameContext } from "../../context/GameContext";
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
  ladderName?: string;
  match: LadderMatch;
  currentUserId?: string;
  checkedIn: boolean;
}

const SCORE_COLORS: Record<LadderMatchOutcome, string> = {
  win: "#19a800ff",
  loss: "#FF4B6E",
  undecided: "#64748b",
};

type LobbyGameTeam = GameTeam & { teamName?: string };
type LobbyGame = Omit<Game, "team1" | "team2"> & {
  team1: LobbyGameTeam;
  team2: LobbyGameTeam;
};

const GameLobby: React.FC<GameLobbyProps> = ({
  ladderId,
  ladderName,
  match,
  currentUserId,
  checkedIn,
}) => {
  const { getUserById, currentUser } = useContext(UserContext);
  const { fetchLadderTeams, fetchLadderParticipants } =
    useContext(LadderContext);
  const { findRankIndex } = useContext(GameContext);
  const { showBottomToast } = useContext(PopupContext);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const [players, setPlayers] = useState<ParticipantProfile[]>([]);
  const [ladderTeamByKey, setLadderTeamByKey] = useState<
    Record<string, TeamStats>
  >({});
  const [participantByUserId, setParticipantByUserId] = useState<
    Record<string, ScoreboardProfile>
  >({});
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [checkinCollapsed, setCheckinCollapsed] = useState(false);

  const isCompleted = match.matchStatus === LADDER_MATCH_STATUS.COMPLETED;
  const allCheckedIn = players.length > 0 && checkedIn;
  const gamesLocked = isCompleted || !allCheckedIn;

  const score = getLadderMatchScore(match, currentUserId ?? "");

  const isDoubles =
    match.ladderType === LADDER_TYPE.DOUBLES || match.participants.length > 2;
  const matchTeams = match.teams ?? [];
  const hasTwoTeams = isDoubles && matchTeams.length === 2;

  // enable LayoutAnimation on Android
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // toggle check-in collapse with animated layout change
  const toggleCheckin = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCheckinCollapsed((s) => !s);
  };

  // ensure collapse is reset when switching to singles
  useEffect(() => {
    if (!isDoubles && checkinCollapsed) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCheckinCollapsed(false);
    }
  }, [isDoubles, checkinCollapsed]);

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

  // Doubles: fetch the ladder's teams (by teamKey) so the score bar, shells and
  // team headers can show the team name/photo and link to the team page —
  // MatchTeam carries only ids.
  useEffect(() => {
    if (!isDoubles || matchTeams.length === 0) {
      setLadderTeamByKey({});
      return;
    }
    let active = true;
    (async () => {
      try {
        const teams = await fetchLadderTeams(ladderId);
        const map: Record<string, TeamStats> = {};
        teams.forEach((t) => {
          if (t.teamKey) map[t.teamKey] = t;
        });
        if (active) setLadderTeamByKey(map);
      } catch (error) {
        console.error("Error loading ladder teams:", error);
        if (active) setLadderTeamByKey({});
      }
    })();
    return () => {
      active = false;
    };
  }, [isDoubles, matchTeams.length, ladderId, fetchLadderTeams]);

  // Singles: fetch the ladder participant docs so a check-in row can open the
  // player's ladder profile (per-ladder stats), not their global profile.
  useEffect(() => {
    if (isDoubles) {
      setParticipantByUserId({});
      return;
    }
    let active = true;
    (async () => {
      try {
        const rows = await fetchLadderParticipants(ladderId);
        const map: Record<string, ScoreboardProfile> = {};
        rows.forEach((p) => {
          if (p.userId) map[p.userId] = p;
        });
        if (active) setParticipantByUserId(map);
      } catch (error) {
        console.error("Error loading ladder participants:", error);
        if (active) setParticipantByUserId({});
      }
    })();
    return () => {
      active = false;
    };
  }, [isDoubles, ladderId, fetchLadderParticipants]);

  const teamName = (t?: TeamStats): string =>
    t ? t.teamName?.trim() || (t.team ?? []).join(" & ") : "Team";

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

  const profileById = new Map(players.map((p) => [p.userId, p]));
  const teamKeyByPlayer = new Map<string, string>();
  matchTeams.forEach((t) =>
    t.playerIds.forEach((id) => teamKeyByPlayer.set(id, t.teamKey)),
  );
  const teamNameForCells = (team?: GameTeam): string => {
    const uid = team?.player1?.userId ?? team?.player2?.userId ?? undefined;
    const key = uid ? teamKeyByPlayer.get(uid) : undefined;
    return key ? teamName(ladderTeamByKey[key]) : "";
  };

  // Group the two sides. Doubles shows the current user's team on the left
  // (matching the viewer-relative score), the opponent team on the right.
  const userTeamIdx = hasTwoTeams
    ? Math.max(
        0,
        matchTeams.findIndex((t) => t.playerIds.includes(currentUserId ?? "")),
      )
    : -1;
  const userTeam = hasTwoTeams ? matchTeams[userTeamIdx] : undefined;
  const opponentTeam = hasTwoTeams
    ? matchTeams[userTeamIdx === 0 ? 1 : 0]
    : undefined;
  const teamForKey = (key?: string): TeamStats | undefined =>
    key ? ladderTeamByKey[key] : undefined;

  const user = players.find((p) => p.userId === currentUserId);
  const opponents = players.filter((p) => p.userId !== currentUserId);
  const leftNames = hasTwoTeams
    ? [teamName(teamForKey(userTeam?.teamKey))]
    : user
      ? [formatDisplayName(user)]
      : ["You"];
  const rightNames = hasTwoTeams
    ? [teamName(teamForKey(opponentTeam?.teamKey))]
    : opponents.length > 0
      ? opponents.map((p) => formatDisplayName(p))
      : ["Opponent"];

  // A forfeit completes the match with no games. The walkover fields are
  // written by the No Shows admin flow; `walkoverReason` names why (e.g. a no
  // show) so the pill can distinguish it from other forfeit types later.
  const walkoverMatch = match as LadderMatch & {
    walkover?: boolean;
    walkoverWinner?: string;
    walkoverReason?: string;
  };
  const isWalkover = walkoverMatch.walkover === true;
  const walkoverReason = walkoverMatch.walkoverReason ?? "No show";
  const namePlayer = (found?: ParticipantProfile): string =>
    found ? formatDisplayName(found) : "";
  const walkoverWinnerLabel = !isWalkover
    ? ""
    : hasTwoTeams
      ? teamName(ladderTeamByKey[walkoverMatch.walkoverWinner ?? ""])
      : namePlayer(
          players.find((p) => p.userId === walkoverMatch.walkoverWinner),
        );
  const walkoverLoserLabel = !isWalkover
    ? ""
    : hasTwoTeams
      ? teamName(
          ladderTeamByKey[
            matchTeams.find((t) => t.teamKey !== walkoverMatch.walkoverWinner)
              ?.teamKey ?? ""
          ],
        )
      : namePlayer(
          players.find((p) => p.userId !== walkoverMatch.walkoverWinner),
        );

  const gamesWithPlayers: LobbyGame[] = match.games.map((game) => {
    const filled = !!(game.team1?.player1 || game.team2?.player1);

    let team1: GameTeam = game.team1;
    let team2: GameTeam = game.team2;
    if (!filled) {
      if (hasTwoTeams) {
        const userCells = (userTeam?.playerIds ?? []).map((id) =>
          toPlayerCell(profileById.get(id)),
        );
        const oppCells = (opponentTeam?.playerIds ?? []).map((id) =>
          toPlayerCell(profileById.get(id)),
        );
        team1 = {
          ...game.team1,
          player1: userCells[0] ?? null,
          player2: userCells[1] ?? null,
        };
        team2 = {
          ...game.team2,
          player1: oppCells[0] ?? null,
          player2: oppCells[1] ?? null,
        };
      } else {
        team1 = { ...game.team1, player1: toPlayerCell(user), player2: null };
        team2 = {
          ...game.team2,
          player1: toPlayerCell(opponents[0]),
          player2: isDoubles ? toPlayerCell(opponents[1]) : null,
        };
      }
    }

    return {
      ...game,
      team1: hasTwoTeams
        ? { ...team1, teamName: teamNameForCells(team1) }
        : team1,
      team2: hasTwoTeams
        ? { ...team2, teamName: teamNameForCells(team2) }
        : team2,
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
    const isReported = !!game.result || (game.approvalStatus ?? "") !== "";

    if (isReported) {
      navigation.navigate("GameScreen", {
        gameId: game.gameId,
        competitionId: ladderId,
        competitionType: COMPETITION_TYPES.LADDER,
        competitionName: ladderName ?? match.court?.courtName ?? "Ladder match",
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

  // A check-in row opens a player's profile: doubles → global profile (the
  // ladder ranks the team), singles → their ladder profile.
  const openPlayer = (userId?: string) => {
    if (!userId) return;
    if (!isDoubles) {
      const participant = participantByUserId[userId];
      if (participant) {
        navigation.navigate("PlayerDetails", { selectedPlayer: participant });
        return;
      }
    }
    navigation.navigate("UserProfile", { userId });
  };

  const openTeam = (teamId?: string) => {
    if (teamId) navigation.navigate("TeamDetails", { teamId });
  };

  const renderCheckinRow = (
    player: ParticipantProfile,
    onPress: () => void,
    nested = false,
  ) => {
    const xp = player.profileDetail?.XP ?? 0;
    const rankLevel = findRankIndex(xp) + 1;
    // Reflect the real check-in record — a walkover completes the match without
    // anyone checking in, so completion alone must not imply checked-in.
    const isCheckedIn = hasUserCheckedIn(match, player.userId);
    return (
      <PlayerRow
        key={player.userId}
        activeOpacity={0.7}
        nested={nested}
        onPress={onPress}
        testID={`checkin-${player.userId}`}
      >
        <Avatar
          source={
            player.profileImage ? { uri: player.profileImage } : ccDefaultImage
          }
        />
        <PlayerName numberOfLines={1}>{formatDisplayName(player)}</PlayerName>
        <StatusBadge isCheckedIn={isCheckedIn}>
          <Dot isCheckedIn={isCheckedIn} />
          <CheckText isCheckedIn={isCheckedIn}>
            {isCheckedIn ? "Checked In" : "Not checked In"}
          </CheckText>
        </StatusBadge>
        <MedalCol>
          <MedalDisplay xp={xp} size={40} />
          <RankLevel>{rankLevel}</RankLevel>
        </MedalCol>
        <Ionicons name="chevron-forward" size={16} color="#46596e" />
      </PlayerRow>
    );
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 40 }}
      >
        <PaddedBlock>
          <CheckinHeader>
            <BlockTitle>Check-in</BlockTitle>
            {isDoubles ? (
              <CollapseToggle
                activeOpacity={0.7}
                onPress={toggleCheckin}
                testID="checkin-collapse-toggle"
              >
                <Ionicons
                  name={checkinCollapsed ? "chevron-down" : "chevron-up"}
                  size={20}
                  color="#9fb8c8"
                />
              </CollapseToggle>
            ) : null}
          </CheckinHeader>

          {players.length === 0 ? (
            <MutedText>Waiting for an opponent to accept.</MutedText>
          ) : hasTwoTeams ? (
            <PlayerList>
              {matchTeams.map((mt) => {
                const teamDoc = ladderTeamByKey[mt.teamKey];
                const roster = mt.playerIds
                  .map((id) => players.find((p) => p.userId === id))
                  .filter((p): p is ParticipantProfile => !!p);
                return (
                  <TeamGroup key={mt.teamKey}>
                    <TeamHeader
                      activeOpacity={0.8}
                      onPress={() => openTeam(mt.teamId)}
                      testID={`checkin-team-${mt.teamId}`}
                    >
                      {teamDoc?.teamProfilePic ? (
                        <TeamAvatar source={{ uri: teamDoc.teamProfilePic }} />
                      ) : (
                        <TeamAvatarPlaceholder>
                          <Ionicons name="people" size={18} color="#00A2FF" />
                        </TeamAvatarPlaceholder>
                      )}
                      <TeamHeaderName numberOfLines={1}>
                        {teamName(teamDoc)}
                      </TeamHeaderName>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#46596e"
                      />
                    </TeamHeader>
                    {!checkinCollapsed
                      ? roster.map((player) =>
                          renderCheckinRow(
                            player,
                            () => openPlayer(player.userId),
                            true,
                          ),
                        )
                      : null}
                  </TeamGroup>
                );
              })}
            </PlayerList>
          ) : checkinCollapsed ? null : (
            <PlayerList>
              {players.map((player) =>
                renderCheckinRow(player, () => openPlayer(player.userId)),
              )}
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
              {score.user} - {score.opponent}
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
          {isWalkover ? (
            <StatusChip forfeit testID="lobby-games-forfeit">
              <Ionicons name="flag" size={12} color="#FFA500" />
              <StatusChipText forfeit>Forfeit ({walkoverReason})</StatusChipText>
            </StatusChip>
          ) : isCompleted ? (
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
        {isWalkover && walkoverWinnerLabel ? (
          <ForfeitNote testID="lobby-forfeit-note">
            {walkoverWinnerLabel} won by walkover
            {walkoverLoserLabel ? ` — ${walkoverLoserLabel} didn't check in` : ""}
          </ForfeitNote>
        ) : null}

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

const CollapseToggle = styled.TouchableOpacity({
  marginRight: 4,
  padding: 4,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: "#9fb8c8",
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

const PlayerRow = styled.TouchableOpacity<{ nested?: boolean }>(
  ({ nested }: { nested?: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingLeft: nested ? 12 : 0,
    marginLeft: nested ? 8 : 0,
    borderLeftWidth: nested ? 2 : 0,
    borderLeftColor: "#1b2c40",
    borderBottomWidth: 1,
    borderBottomColor: "rgb(9, 33, 62)",
    borderTopWidth: nested ? 0 : 1,
    borderTopColor: "rgb(9, 33, 62)",
  }),
);

const TeamGroup = styled.View({
  marginBottom: 8,
});

const TeamHeader = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 11,
  paddingVertical: 11,
  paddingHorizontal: 12,
  marginTop: 8,
  borderRadius: 12,
  backgroundColor: "rgba(0, 162, 255, 0.07)",
  borderWidth: 1,
  borderColor: "rgba(0, 162, 255, 0.35)",
});

const TeamAvatar = styled.Image({
  width: 34,
  height: 34,
  borderRadius: 10,
  backgroundColor: "#0a1929",
});

const TeamAvatarPlaceholder = styled.View({
  width: 34,
  height: 34,
  borderRadius: 10,
  backgroundColor: "#0a1929",
  borderWidth: 1,
  borderColor: "rgba(0, 162, 255, 0.35)",
  justifyContent: "center",
  alignItems: "center",
});

const TeamHeaderName = styled.Text({
  flex: 1,
  minWidth: 0,
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "bold",
});

const Avatar = styled.Image({
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: "rgb(9, 33, 62)",
});

const MedalCol = styled.View({
  alignItems: "center",
  justifyContent: "center",
});

const RankLevel = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
  color: "#ffffff",
  marginTop: 2,
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

const StatusChip = styled.View<{ completed?: boolean; forfeit?: boolean }>(
  ({ completed, forfeit }: { completed?: boolean; forfeit?: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: forfeit
      ? "rgba(255, 165, 0, 0.12)"
      : completed
        ? "#0c3d24"
        : "rgba(255, 255, 255, 0.06)",
  }),
);

const StatusChipText = styled.Text<{ completed?: boolean; forfeit?: boolean }>(
  ({ completed, forfeit }: { completed?: boolean; forfeit?: boolean }) => ({
    color: forfeit ? "#FFA500" : completed ? "#5ef0a6" : "#9fb8c8",
    fontSize: 11,
    fontWeight: "600",
  }),
);

const ForfeitNote = styled.Text({
  marginHorizontal: 20,
  marginTop: -4,
  marginBottom: 12,
  color: "#9fb8c8",
  fontSize: 12,
});

const GamesList = styled.View<{ isLocked: boolean }>(
  ({ isLocked }: { isLocked: boolean }) => ({
    opacity: isLocked ? 0.5 : 1,
  }),
);
