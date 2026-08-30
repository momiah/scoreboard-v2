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

interface CheckinControl {
  checkedIn: boolean;
  onPress: () => void;
}

interface MatchCardProps {
  match: LadderMatch;
  onPress?: (match: LadderMatch) => void;
  // Show the match status (awaiting-approval / completed) at the far right of
  // the tag row. Only meaningful once a match is accepted, so it's off for
  // Matchmaking. Used as a preview in the Schedule list.
  showProgress?: boolean;
  // When set, renders the self check-in control at the far right of the tag row
  // (button → awaiting-approval / tick). Used on the match details screen.
  checkin?: CheckinControl;
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
  checkin,
  flat = false,
  onLocationPress,
  testID,
}) => {
  const city = match.court?.location?.city;
  const courtName = match.court?.courtName ?? "";
  const progress = getLadderMatchProgress(match);
  const hasCourtFee = match.courtFee > 0;
  const isCompleted = match.matchStatus === LADDER_MATCH_STATUS.COMPLETED;

  // The far-right slot of the tag row (the stat column only ever shows date +
  // time, plus the fee tag on Matchmaking). One place, one status:
  //   check-in button → awaiting-approval chip → completed / checked-in tick.
  const showStatus = showProgress || !!checkin;
  const tagStatus = !showStatus ? null : checkin &&
    !checkin.checkedIn &&
    !isCompleted ? (
    <CheckinButton
      activeOpacity={0.85}
      onPress={checkin.onPress}
      testID={testID ? `${testID}-checkin-button` : undefined}
    >
      <CheckinButtonText>Press here to checkin</CheckinButtonText>
    </CheckinButton>
  ) : progress.pendingApproval > 0 ? (
    <AwaitingTag testID={testID ? `${testID}-awaiting` : undefined}>
      <AwaitingTagText numberOfLines={1}>
        {progress.pendingApproval}{" "}
        {progress.pendingApproval === 1 ? "game" : "games"} awaiting approval
      </AwaitingTagText>
    </AwaitingTag>
  ) : checkin && checkin.checkedIn ? (
    <CheckedInTag testID={testID ? `${testID}-checked-in` : undefined}>
      <Ionicons name="checkmark-circle-outline" size={16} color="#5ef0a6" />
      <CheckedInTagText>Checked in</CheckedInTagText>
    </CheckedInTag>
  ) : isCompleted ? (
    <Ionicons
      name="checkmark-circle-outline"
      size={22}
      color="#008c13ff"
      testID={testID ? `${testID}-status-done` : undefined}
    />
  ) : null;

  return (
    <Card
      testID={testID}
      activeOpacity={0.8}
      isFlat={flat}
      disabled={!onPress}
      onPress={() => onPress?.(match)}
    >
      <HeaderRow flat={flat}>
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
        </Info>

        <StatCell>
          <StatDate>{formatMatchDateShort(match.matchDate)}</StatDate>
          <StatTime>{match.matchTime?.start}</StatTime>
        </StatCell>
      </HeaderRow>

      {/* Full-width row: tags on the left, status on the far right. */}
      <TagRow flat={flat}>
        <TagGroup>
          <Tag>
            <TagText>🏸 {match.shuttleType}</TagText>
          </Tag>
          <Tag>
            <Ionicons name="trophy-outline" size={13} color="#9fb8c8" />
            <TagText>Best of {match.bestOf}</TagText>
          </Tag>
          {/* Fee sits inline with the other tags, only on Matchmaking (before
              a match is accepted, i.e. no status column). */}
          {!showStatus && (
            <FeeTag hasCourtFee={hasCourtFee}>
              <FeeText hasCourtFee={hasCourtFee}>{feeLabel(match)}</FeeText>
            </FeeTag>
          )}
        </TagGroup>
        {tagStatus && <TagStatus>{tagStatus}</TagStatus>}
      </TagRow>
    </Card>
  );
};

export default MatchCard;

const Card = styled.TouchableOpacity<{ isFlat: boolean }>(
  ({ isFlat }: { isFlat: boolean }) => ({
    flexDirection: "column",
    padding: isFlat ? 0 : isSmallScreen ? 13 : 15,
    borderRadius: isFlat ? 0 : 8,
    backgroundColor: isFlat ? "transparent" : "rgba(0, 0, 0, 0.3)",
    borderWidth: isFlat ? 0 : 1,
    borderColor: "rgb(26, 28, 54)",
  }),
);

const HeaderRow = styled.View<{ flat?: boolean }>(
  ({ flat }: { flat?: boolean }) => ({
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: flat ? "flex-start" : "center",
    gap: 12,
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: flat ? 32 : 12,
  }),
);

const TagGroup = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  flexShrink: 1,
});

// Sits at the far right of the tag row (tags on the left via space-between).
const TagStatus = styled.View({
  flexShrink: 0,
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

const AwaitingTag = styled.View({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: 8,
});

const AwaitingTagText = styled.Text({
  color: "#FFA500",
  fontSize: 11,
  fontWeight: "600",
});

const CheckedInTag = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: 8,
  backgroundColor: "rgba(0, 200, 83, 0.15)",
});

const CheckedInTagText = styled.Text({
  color: "#5ef0a6",
  fontSize: 11,
  fontWeight: "600",
});

const StatCell = styled.View({
  alignItems: "center",
  justifyContent: "center",
  minWidth: 72,
  maxWidth: 100,
});

const CheckinButton = styled.TouchableOpacity({
  paddingHorizontal: 12,
  paddingVertical: 7,
  borderRadius: 8,
  backgroundColor: "#00A2FF",
});

const CheckinButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 12,
  fontWeight: "700",
  textAlign: "center",
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

const FeeTag = styled.View<{ hasCourtFee: boolean }>(
  ({ hasCourtFee }: { hasCourtFee: boolean }) => ({
    // marginTop: 8,
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
