import React from "react";
import { Dimensions } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

import type { LadderMatch } from "@shared/types";

import { formatCurrency } from "../../helpers/formatCurrency";

const { width: screenWidth } = Dimensions.get("window");
const isSmallScreen = screenWidth < 400;

interface MatchCardProps {
  match: LadderMatch;
  onPress?: (match: LadderMatch) => void;
  disabled?: boolean;
  disabledLabel?: string;
  testID?: string;
}

const feeLabel = (match: LadderMatch): string =>
  match.courtFee > 0
    ? formatCurrency(match.courtFee, match.currencyType)
    : "Free";

const locationLabel = (match: LadderMatch): string => {
  const city = match.court?.location?.city;
  const courtName = match.court?.courtName ?? "";
  return city ? `${courtName}, ${city}` : courtName;
};

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

  return (
    <Card
      testID={testID}
      activeOpacity={disabled ? 1 : 0.8}
      isDisabled={disabled}
      disabled={disabled || !onPress}
      onPress={handlePress}
    >
      <TopRow>
        <LocationRow>
          <Ionicons name="location-outline" size={16} color="#00A2FF" />
          <LocationText numberOfLines={1}>{locationLabel(match)}</LocationText>
        </LocationRow>
        <FeeTag isFree={match.courtFee <= 0}>
          <FeeText isFree={match.courtFee <= 0}>{feeLabel(match)}</FeeText>
        </FeeTag>
      </TopRow>

      <DetailsGrid>
        <DetailItem>
          <Ionicons name="calendar-outline" size={14} color="#9fb8c8" />
          <DetailText>{match.matchDate}</DetailText>
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

      {disabled && !!disabledLabel && (
        <DisabledBadge testID={testID ? `${testID}-disabled` : undefined}>
          <DisabledBadgeText>{disabledLabel}</DisabledBadgeText>
        </DisabledBadge>
      )}
    </Card>
  );
};

export default MatchCard;

const Card = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    padding: 15,
    borderRadius: 10,
    backgroundColor: "rgb(3, 16, 31)",
    borderWidth: 1,
    borderColor: "rgb(9, 33, 62)",
    gap: 12,
    opacity: isDisabled ? 0.55 : 1,
  }),
);

const TopRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
});

const LocationRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  flexShrink: 1,
});

const LocationText = styled.Text({
  color: "#ffffff",
  fontSize: isSmallScreen ? 14 : 15,
  fontWeight: "bold",
  flexShrink: 1,
});

const FeeTag = styled.View<{ isFree: boolean }>(
  ({ isFree }: { isFree: boolean }) => ({
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: isFree ? "rgba(0, 200, 120, 0.15)" : "rgba(0, 162, 255, 0.15)",
  }),
);

const FeeText = styled.Text<{ isFree: boolean }>(
  ({ isFree }: { isFree: boolean }) => ({
    color: isFree ? "#22c58a" : "#00A2FF",
    fontSize: 12,
    fontWeight: "bold",
  }),
);

const DetailsGrid = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  rowGap: 8,
});

const DetailItem = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  width: "50%",
});

const DetailText = styled.Text({
  color: "#cbd5e1",
  fontSize: isSmallScreen ? 12 : 13,
});

const DisabledBadge = styled.View({
  alignSelf: "flex-start",
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
