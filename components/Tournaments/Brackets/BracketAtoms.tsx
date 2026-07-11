// components/Tournament/Brackets/BracketAtoms.tsx
import React from "react";
import styled from "styled-components/native";
import { Dimensions } from "react-native";
import Tag from "../../Tag";
import { Game, GameTeam } from "@shared/types";

// ── Player name ──────────────────────────────────────────────────────────

const PlayerName = ({ player }: { player: GameTeam["player1"] }) => (
  <PlayerNameText numberOfLines={1}>
    {player?.displayName || player?.firstName || "TBD"}
  </PlayerNameText>
);

// ── Single team row (1 or 2 players stacked) ─────────────────────────────

const TeamRow = ({
  team,
  tournamentType,
}: {
  team: GameTeam;
  tournamentType: string;
}) => (
  <TeamRowContainer>
    <PlayerName player={team?.player1} />
    {tournamentType === "Doubles" && <PlayerName player={team?.player2} />}
  </TeamRowContainer>
);

// ── Header ───────────────────────────────────────────────────────────────

const CardHeader = ({ game, label }: { game: Game; label?: string | null }) => (
  <HeaderRow>
    <HeaderLeft>
      <Tag name={`Game ${game.gameNumber}`} bold color="#00A2FF" />
      {game.court != null && <Tag name={`Court ${game.court}`} bold />}
    </HeaderLeft>
    {label && <Tag name={label} bold color="#FFA500" />}
  </HeaderRow>
);

// ── Score column ─────────────────────────────────────────────────────────

const ScoreSection = ({ game }: { game: Game }) => {
  const hasResult = !!game?.result;
  if (!hasResult) {
    return (
      <ScoreColumnContainer>
        <ScoreText>—</ScoreText>
      </ScoreColumnContainer>
    );
  }
  return (
    <ScoreColumnContainer>
      <ScoreText style={{ fontSize: 20 }}>{game.team1.score}</ScoreText>

      <ScoreText style={{ fontSize: 20 }}>{game.team2.score}</ScoreText>
    </ScoreColumnContainer>
  );
};

// ── Full card ────────────────────────────────────────────────────────────

export const BracketGameCard = ({
  game,
  label,
  tournamentType,
  shell,
  onPress,
}: {
  game: Game;
  label?: string | null;
  tournamentType: string;
  shell: boolean;
  onPress: () => void;
}) => {
  const status = game?.approvalStatus;
  const statusKey = typeof status === "string" ? status.toLowerCase() : null;
  const statusLabel =
    statusKey === "scheduled"
      ? "Scheduled"
      : statusKey === "pending"
        ? "Pending"
        : statusKey === "approved"
          ? "Approved"
          : null;

  return (
    <CardPressable shell={shell} disabled={shell} onPress={onPress}>
      <CardHeader game={game} label={label} />
      <Divider />
      <BodyRow>
        <TeamsColumn>
          <TeamRow team={game.team1} tournamentType={tournamentType} />
          <TeamSeparator />
          <TeamRow team={game.team2} tournamentType={tournamentType} />
        </TeamsColumn>
        {statusLabel && (
          <StatusPillWrapper>
            <StatusPill status={statusLabel as string}>
              {statusLabel}
            </StatusPill>
          </StatusPillWrapper>
        )}
        <ScoreSection game={game} />
      </BodyRow>
    </CardPressable>
  );
};

// ── Styled ───────────────────────────────────────────────────────────────

const { width: screenWidth } = Dimensions.get("window");
const isSmallScreen = screenWidth < 400;

const CardPressable = styled.TouchableOpacity<{ shell: boolean }>(
  ({ shell }: { shell: boolean }) => ({
    backgroundColor: "rgb(3, 16, 31)",
    borderColor: "rgb(9, 33, 62)",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    opacity: shell ? 0.55 : 1,
  }),
);

const HeaderRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
  flexWrap: "wrap",
  gap: 4,
});

const HeaderLeft = styled.View({
  flexDirection: "row",
  gap: 4,
});

const Divider = styled.View({
  height: 1,
  backgroundColor: "rgba(255,255,255,0.05)",
  marginBottom: 8,
});

const BodyRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
});

const TeamsColumn = styled.View({
  flex: 1,
});

const TeamRowContainer = styled.View({
  gap: 5,
});

const TeamSeparator = styled.View({
  height: 1,
  backgroundColor: "rgba(255,255,255,0.04)",
  marginVertical: 6,
});

const PlayerNameText = styled.Text({
  color: "#fff",
  fontSize: isSmallScreen ? 13 : 14,
});

const ScoreColumnContainer = styled.View({
  alignSelf: "stretch",
  alignItems: "center",
  justifyContent: "space-around",
  paddingLeft: 12,
  marginLeft: 8,
  borderLeftWidth: 1,
  borderLeftColor: "rgba(255,255,255,0.05)",
  minWidth: 64,
});

const ScoreText = styled.Text({
  color: "#00A2FF",
  fontSize: 16,
  fontWeight: "bold",
});

const StatusPill = styled.Text<{ status: string }>(
  ({ status }: { status: string }) => ({
    fontSize: 8,
    color: "#fff",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor:
      status === "Scheduled"
        ? "rgba(0, 162, 255, 0.6)"
        : status === "Approved" || status === "approved"
          ? "rgba(0, 200, 0, 0.6)"
          : "rgba(255, 165, 0, 0.6)",
  }),
);

const StatusPillWrapper = styled.View({
  alignItems: "center",
  justifyContent: "center",
  marginHorizontal: 6,
});

export const BracketSectionLabel = styled.Text({
  color: "#7e8ba0",
  fontSize: 11,
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 8,
  marginTop: 16,
});
