import React from "react";
import { Dimensions } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

import type { LadderMatch } from "@shared/types";

import { formatMatchDateShort } from "../../helpers/ladderMatchTime";
import { getLadderMatchProgress } from "../../helpers/ladderMatchProgress";

const { width: screenWidth } = Dimensions.get("window");
const isSmallScreen = screenWidth < 400;

interface MatchCardProps {
  match: LadderMatch;
  onPress?: (match: LadderMatch) => void;
  disabled?: boolean;
  disabledLabel?: string;
  testID?: string;
}

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onPress,
  disabled = false,
  disabledLabel,
  testID,
}) => {
  const handlePress = () => {
    if (disabled) return;
    onPress?.(match);
  };

  const city = match.court?.location?.city;
  const courtName = match.court?.courtName ?? "";
  const progress = getLadderMatchProgress(match);

  return (
    <Card
      testID={testID}
      activeOpacity={disabled ? 1 : 0.8}
      isDisabled={disabled}
      disabled={disabled || !onPress}
      onPress={handlePress}
    >
      {disabled && !!disabledLabel && (
        <DisabledBadge testID={testID ? `${testID}-disabled` : undefined}>
          <DisabledBadgeText>{disabledLabel}</DisabledBadgeText>
        </DisabledBadge>
      )}

      <Info>
        <Title numberOfLines={1}>{courtName}</Title>
        {!!city && <Subtitle numberOfLines={1}>{city}</Subtitle>}
        <TagRow>
          <Tag>
            <TagText>🏸 {match.shuttleType}</TagText>
          </Tag>
          <Tag>
            <TagText>
              {progress.completed}/{progress.total} games completed
            </TagText>
          </Tag>
        </TagRow>
      </Info>

      <StatCell>
        <StatDate>{formatMatchDateShort(match.matchDate)}</StatDate>
        <StatTime>{match.matchTime?.start}</StatTime>
        {progress.allCompleted ? (
          <Ionicons
            name="checkmark-circle"
            size={16}
            color="green"
            style={{ marginTop: 6 }}
          />
        ) : progress.pendingApproval > 0 ? (
          <AwaitingText>
            {progress.pendingApproval}{" "}
            {progress.pendingApproval === 1 ? "game" : "games"} awaiting approval
          </AwaitingText>
        ) : null}
      </StatCell>
    </Card>
  );
};

export default MatchCard;

const Card = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    position: "relative",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: isSmallScreen ? 13 : 15,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderWidth: 1,
    borderColor: "rgb(26, 28, 54)",
    opacity: isDisabled ? 0.55 : 1,
  }),
);

const Info = styled.View({
  flex: 1,
  minWidth: 0,
});

const Title = styled.Text({
  color: "#ffffff",
  fontWeight: "bold",
  fontSize: isSmallScreen ? 15 : 16,
});

const Subtitle = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
  marginTop: 3,
});

const TagRow = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 12,
});

const Tag = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: 8,
  backgroundColor: "#152534",
});

const TagText = styled.Text({
  color: "#cbd5e1",
  fontSize: 11,
  fontWeight: "500",
});

const StatCell = styled.View({
  alignItems: "center",
  justifyContent: "center",
  minWidth: 72,
  maxWidth: 96,
});

const StatDate = styled.Text({
  color: "#aab7c4",
  fontSize: 11,
});

const StatTime = styled.Text({
  color: "#ffffff",
  fontSize: 20,
  fontWeight: "bold",
  marginTop: 2,
});

const AwaitingText = styled.Text({
  color: "#FFA500",
  fontSize: 10,
  fontWeight: "600",
  textAlign: "center",
  marginTop: 6,
});

const DisabledBadge = styled.View({
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 1,
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 8,
  backgroundColor: "rgba(255, 255, 255, 0.08)",
});

const DisabledBadgeText = styled.Text({
  color: "#9fb8c8",
  fontSize: 11,
  fontWeight: "bold",
});
