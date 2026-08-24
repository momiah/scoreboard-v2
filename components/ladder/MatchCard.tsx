import React from "react";
import { Dimensions } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

import { LADDER_MATCH_STATUS } from "@shared";
import type { LadderMatch } from "@shared/types";

import { formatMatchDateShort } from "../../helpers/ladderMatchTime";
import { getLadderMatchProgress } from "../../helpers/ladderMatchProgress";
import { formatCurrency } from "../../helpers/formatCurrency";

const { width: screenWidth } = Dimensions.get("window");
const isSmallScreen = screenWidth < 400;

interface MatchCardProps {
  match: LadderMatch;
  onPress?: (match: LadderMatch) => void;
  // Show game progress (x/total completed + awaiting-approval / done state).
  // Only meaningful once a match is accepted, so it's off for Matchmaking.
  showProgress?: boolean;
  // Renders with no card background/border/padding and no text clipping — for
  // embedding the match details flat on a parent surface.
  flat?: boolean;
  // When set, an external-link icon next to the location opens it (e.g. in maps).
  onLocationPress?: () => void;
  testID?: string;
}

const feeLabel = (match: LadderMatch): string =>
  match.courtFee > 0
    ? `Court Fee - ${formatCurrency(match.courtFee, match.currencyType)}`
    : "No court fee";

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onPress,
  showProgress = false,
  flat = false,
  onLocationPress,
  testID,
}) => {
  const city = match.court?.location?.city;
  const courtName = match.court?.courtName ?? "";
  const progress = getLadderMatchProgress(match);
  const hasCourtFee = match.courtFee > 0;
  const isCompleted = match.matchStatus === LADDER_MATCH_STATUS.COMPLETED;

  return (
    <Card
      testID={testID}
      activeOpacity={0.8}
      isFlat={flat}
      disabled={!onPress}
      onPress={() => onPress?.(match)}
    >
      <Info>
        <TitleRow>
          <Title numberOfLines={flat ? undefined : 1} flat={flat}>
            {courtName}{" "}
            {!!onLocationPress && (
              <LocationLink
                testID={testID ? `${testID}-map-link` : undefined}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={onLocationPress}
              >
                <Ionicons name="open-outline" size={16} color="#00A2FF" />
              </LocationLink>
            )}
          </Title>
        </TitleRow>
        {!!city && (
          <Subtitle numberOfLines={flat ? undefined : 1}>{city}</Subtitle>
        )}
        <TagRow flat={flat}>
          <Tag>
            <TagText>🏸 {match.shuttleType}</TagText>
          </Tag>
          <Tag>
            <Ionicons name="trophy-outline" size={13} color="#9fb8c8" />
            <TagText>Best of {match.bestOf}</TagText>
          </Tag>
        </TagRow>
      </Info>

      <StatCell>
        <StatDate>{formatMatchDateShort(match.matchDate)}</StatDate>
        <StatTime>{match.matchTime?.start}</StatTime>
        {showProgress ? (
          isCompleted ? (
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color="green"
              style={{ marginTop: 6 }}
            />
          ) : progress.pendingApproval > 0 ? (
            <AwaitingText>
              {progress.pendingApproval}{" "}
              {progress.pendingApproval === 1 ? "game" : "games"} awaiting
              approval
            </AwaitingText>
          ) : null
        ) : (
          <FeeTag hasCourtFee={hasCourtFee}>
            <FeeText hasCourtFee={hasCourtFee}>{feeLabel(match)}</FeeText>
          </FeeTag>
        )}
      </StatCell>
    </Card>
  );
};

export default MatchCard;

const Card = styled.TouchableOpacity<{ isFlat: boolean }>(
  ({ isFlat }: { isFlat: boolean }) => ({
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: isFlat ? "flex-start" : "center",
    gap: 12,
    padding: isFlat ? 0 : isSmallScreen ? 13 : 15,
    borderRadius: isFlat ? 0 : 8,
    backgroundColor: isFlat ? "transparent" : "rgba(0, 0, 0, 0.3)",
    borderWidth: isFlat ? 0 : 1,
    borderColor: "rgb(26, 28, 54)",
  }),
);

const Info = styled.View({
  flex: 1,
  minWidth: 0,
});

const TitleRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});

const Title = styled.Text<{ flat?: boolean }>(
  ({ flat }: { flat?: boolean }) => ({
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: flat ? (isSmallScreen ? 20 : 22) : isSmallScreen ? 14 : 15,
    flexShrink: 1,
  }),
);

const LocationLink = styled.TouchableOpacity({
  padding: 2,
});

const Subtitle = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
  marginTop: 3,
});

const TagRow = styled.View<{ flat?: boolean }>(
  ({ flat }: { flat?: boolean }) => ({
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: flat ? 32 : 12,
  }),
);

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
  maxWidth: 100,
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

const FeeTag = styled.View<{ hasCourtFee: boolean }>(
  ({ hasCourtFee }: { hasCourtFee: boolean }) => ({
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: hasCourtFee ? "#003362ff" : "#1b4600ff",
  }),
);

const FeeText = styled.Text<{ hasCourtFee: boolean }>(
  ({ hasCourtFee }: { hasCourtFee: boolean }) => ({
    color: hasCourtFee ? "#4dbeffff" : "#00FF00",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  }),
);
