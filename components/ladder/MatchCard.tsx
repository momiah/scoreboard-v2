import React from "react";
import { Dimensions } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

import { LADDER_MATCH_STATUS } from "@shared";
import type { LadderMatch } from "@shared/types";

import {
  formatMatchDateShort,
  isMatchDayPassed,
} from "../../helpers/ladderMatchTime";
import {
  getLadderMatchProgress,
  getLadderMatchOutcome,
} from "../../helpers/ladderMatchProgress";
import {
  deriveLadderMatchStatus,
  type LadderMatchPhase,
} from "../../helpers/ladderMatchStatus";
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
  showProgress?: boolean;
  checkin?: CheckinControl;
  flat?: boolean;
  onLocationPress?: () => void;
  forfeitLabel?: string;
  currentUserId?: string;
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
  forfeitLabel,
  currentUserId,
  testID,
}) => {
  const city = match.court?.location?.city;
  const courtName = match.court?.courtName ?? "";
  const progress = getLadderMatchProgress(match);
  const hasCourtFee = match.courtFee > 0;
  const isCompleted = match.matchStatus === LADDER_MATCH_STATUS.COMPLETED;
  const isPosted = match.matchStatus === LADDER_MATCH_STATUS.POSTED;
  // Completed matches, or accepted ones whose play date has passed (a prior
  // day), read as done: dimmed but still pressable (view result / report late).
  // A match scheduled for today stays full contrast all day, and a still-open
  // posted match never dims. The flat header variant always keeps full contrast.
  const dimmed = !flat && (isCompleted || (isMatchDayPassed(match) && !isPosted));

  const status = deriveLadderMatchStatus(match, {
    selfCheckedIn: !!checkin?.checkedIn,
    pendingApproval: progress.pendingApproval,
    forfeitLabel,
  });
  const showStatus = showProgress || !!checkin;
  const outcome =
    currentUserId && isCompleted
      ? getLadderMatchOutcome(match, currentUserId)
      : "undecided";
  const tag = (testID ? `${testID}-` : "") + status.phase;
  const spec = showStatus ? PHASE_TAGS[status.phase] : undefined;
  let tagStatus: React.ReactNode = null;
  if (spec) {
    const { Tag, Text, icon } = spec;
    tagStatus = (
      <Tag testID={tag}>
        {icon && <Ionicons name={icon.name} size={icon.size} color={icon.color} />}
        <Text numberOfLines={1}>{status.label}</Text>
      </Tag>
    );
  } else if (showStatus && checkin) {
    tagStatus = (
      <CheckinButton
        activeOpacity={0.85}
        onPress={checkin.onPress}
        testID={testID ? `${testID}-checkin-button` : undefined}
      >
        <CheckinButtonText>{status.label}</CheckinButtonText>
      </CheckinButton>
    );
  }

  return (
    <Card
      testID={testID}
      activeOpacity={dimmed ? 0.55 : 0.8}
      isFlat={flat}
      disabled={!onPress}
      onPress={() => onPress?.(match)}
      style={dimmed ? { opacity: 0.55 } : undefined}
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
          <StatDate numberOfLines={1}>
            {formatMatchDateShort(match.matchDate)}
          </StatDate>
          <StatTime numberOfLines={1}>
            {match.matchTime?.start?.trim()}
          </StatTime>
        </StatCell>
      </HeaderRow>

      <TagRow flat={flat}>
        <TagGroup>
          <Tag>
            <TagText>🏸 {match.shuttleType}</TagText>
          </Tag>
          <Tag>
            <Ionicons name="trophy-outline" size={13} color="#9fb8c8" />
            <TagText>Best of {match.bestOf}</TagText>
          </Tag>
        </TagGroup>
        {tagStatus && (
          <TagStatus>
            {tagStatus}
            {outcome !== "undecided" && (
              <ResultBadgeText
                isWin={outcome === "win"}
                testID={testID ? `${testID}-result` : undefined}
              >
                {outcome === "win" ? "W" : "L"}
              </ResultBadgeText>
            )}
          </TagStatus>
        )}
        {!showStatus && (
          <FeeTag hasCourtFee={hasCourtFee}>
            <FeeText hasCourtFee={hasCourtFee}>{feeLabel(match)}</FeeText>
          </FeeTag>
        )}
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

const TagStatus = styled.View({
  flexShrink: 0,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
});

const ResultBadgeText = styled.Text<{ isWin: boolean }>(
  ({ isWin }: { isWin: boolean }) => ({
    color: isWin ? "#19a800" : "#FF4B6E",
    fontSize: 15,
    fontWeight: "800",
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

const CompletedTag = styled(CheckedInTag)({});
const CompletedTagText = styled(CheckedInTagText)({});

const StartedTag = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: 8,
  backgroundColor: "rgba(0, 162, 255, 0.16)",
});

const StartedTagText = styled.Text({
  color: "#4db8ff",
  fontSize: 11,
  fontWeight: "600",
});

const WaitingTag = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: 8,
  backgroundColor: "rgba(255, 255, 255, 0.06)",
});

const WaitingTagText = styled.Text({
  color: "#9fb8c8",
  fontSize: 11,
  fontWeight: "600",
});

const CancelledTag = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: 8,
  backgroundColor: "rgba(255, 255, 255, 0.06)",
});

const CancelledTagText = styled.Text({
  color: "#9fb8c8",
  fontSize: 11,
  fontWeight: "600",
});

const ForfeitTag = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderRadius: 8,
  backgroundColor: "rgba(255, 165, 0, 0.12)",
});

const ForfeitTagText = styled.Text({
  color: "#FFA500",
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

interface PhaseTagSpec {
  Tag: React.ComponentType<{ testID?: string; children?: React.ReactNode }>;
  Text: React.ComponentType<{
    numberOfLines?: number;
    children?: React.ReactNode;
  }>;
  icon?: {
    name: React.ComponentProps<typeof Ionicons>["name"];
    size: number;
    color: string;
  };
}

const PHASE_TAGS: Partial<Record<LadderMatchPhase, PhaseTagSpec>> = {
  forfeit: {
    Tag: ForfeitTag,
    Text: ForfeitTagText,
    icon: { name: "flag", size: 13, color: "#FFA500" },
  },
  "no-show-review": {
    Tag: ForfeitTag,
    Text: ForfeitTagText,
    icon: { name: "flag-outline", size: 13, color: "#FFA500" },
  },
  cancelled: {
    Tag: CancelledTag,
    Text: CancelledTagText,
    icon: { name: "close-circle-outline", size: 16, color: "#9fb8c8" },
  },
  completed: {
    Tag: CompletedTag,
    Text: CompletedTagText,
    icon: { name: "checkmark-circle-outline", size: 16, color: "#5ef0a6" },
  },
  "checked-in": {
    Tag: CheckedInTag,
    Text: CheckedInTagText,
    icon: { name: "checkmark-circle-outline", size: 16, color: "#5ef0a6" },
  },
  started: { Tag: StartedTag, Text: StartedTagText },
  "awaiting-approval": { Tag: AwaitingTag, Text: AwaitingTagText },
  "waiting-players": { Tag: WaitingTag, Text: WaitingTagText },
};
