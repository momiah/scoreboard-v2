import React from "react";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import type { GameTeam, LadderPlayoffTie } from "@shared/types";
import {
  getPlayoffTieTeams,
  playoffTieLabel,
} from "../../helpers/ladderPlayoffTies";

interface PlayoffTieCardProps {
  tie: LadderPlayoffTie;
  userId: string | undefined;
  onPress: (tie: LadderPlayoffTie) => void;
  testID?: string;
}

const teamName = (team: GameTeam): string =>
  [team.player1, team.player2]
    .filter(Boolean)
    .map((player) => player?.displayName || player?.firstName || "TBD")
    .join(" & ") || "TBD";

const PlayoffTieCard: React.FC<PlayoffTieCardProps> = ({
  tie,
  userId,
  onPress,
  testID,
}) => {
  const { userTeam, opponentTeam } = getPlayoffTieTeams(tie, userId);

  return (
    <Card activeOpacity={0.85} onPress={() => onPress(tie)} testID={testID}>
      <TopRow>
        <StatusTag>
          <Ionicons name="trophy-outline" size={12} color="#f5c451" />
          <StatusText testID={testID ? `${testID}-status` : undefined}>
            {playoffTieLabel(tie)}
          </StatusText>
        </StatusTag>
        <Ionicons name="chevron-forward" size={18} color="#64748b" />
      </TopRow>
      <Teams>
        <TeamName numberOfLines={1}>{teamName(userTeam)}</TeamName>
        <Versus>vs</Versus>
        <TeamName numberOfLines={1}>{teamName(opponentTeam)}</TeamName>
      </Teams>
      <Detail>Home and away games to be arranged</Detail>
    </Card>
  );
};

export default PlayoffTieCard;

const Card = styled.TouchableOpacity({
  padding: 14,
  borderRadius: 10,
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  borderWidth: 1,
  borderColor: "rgba(245, 196, 81, 0.35)",
  gap: 10,
});

const TopRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
});

const StatusTag = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 6,
  backgroundColor: "rgba(245, 196, 81, 0.12)",
});

const StatusText = styled.Text({
  color: "#f5c451",
  fontSize: 11,
  fontWeight: "bold",
});

const Teams = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});

const TeamName = styled.Text({
  flex: 1,
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "600",
});

const Versus = styled.Text({
  color: "#64748b",
  fontSize: 12,
});

const Detail = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
});
