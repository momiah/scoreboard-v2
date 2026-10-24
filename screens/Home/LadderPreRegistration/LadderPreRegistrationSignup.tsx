import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Share,
} from "react-native";
import {
  useNavigation,
  useRoute,
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { formatCurrency } from "@shared";
import type { LadderPreRegistration } from "@shared/types";
import PreRegistrationHeader from "../../../components/LadderPreRegistration/PreRegistrationHeader";
import { useLadderPreRegistrations } from "../../../hooks/useLadderPreRegistrations";
import {
  LADDER_PRE_REGISTRATION_COLORS as COLORS,
  LADDER_SEASON_STAGES,
  formatPrizePool,
  getEntrantNoun,
  getFullLadderPrizeTable,
  getLadderSizeRows,
  getPlatformFeeFootnote,
  isCashLadder,
} from "../../../helpers/ladderPreRegistrationDisplay";

type SignupRoute = RouteProp<
  { LadderPreRegistrationSignup: { preRegistrationId: string } },
  "LadderPreRegistrationSignup"
>;

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const STAGE_ICONS: Record<
  (typeof LADDER_SEASON_STAGES)[number]["key"],
  { icon: IoniconName; color: string }
> = {
  join: { icon: "person-add-outline", color: COLORS.blue },
  season: { icon: "trending-up-outline", color: COLORS.blue },
  "registration-closes": { icon: "lock-closed-outline", color: COLORS.blue },
  playoffs: { icon: "git-network-outline", color: COLORS.orange },
  champion: { icon: "trophy-outline", color: COLORS.gold },
};

const CLIMB_STEPS: { icon: IoniconName; text: string }[] = [
  {
    icon: "location-outline",
    text: "Post a game at your court, or accept one someone else has posted.",
  },
  {
    icon: "checkmark-circle-outline",
    text: "Check in at the court, play, and publish the result.",
  },
  {
    icon: "stats-chart-outline",
    text: "Win to earn CP and climb. Win streaks and big wins earn bonus CP through Achievement Medals.",
  },
  {
    icon: "git-network-outline",
    text: "The top of the ladder enters a home-and-away knockout. The champion takes the biggest share.",
  },
];

const LadderPreRegistrationSignup: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { params } = useRoute<SignupRoute>();
  const {
    isSignedIn,
    loading,
    preRegistrations,
    registeredIds,
    preRegister,
    leave,
  } = useLadderPreRegistrations();
  const option = preRegistrations.find(
    (preRegistration) =>
      preRegistration.preRegistrationId === params?.preRegistrationId,
  );
  const [submitting, setSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!option) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#00152B" }}>
        <PreRegistrationHeader title="Ladders" />
        {loading ? (
          <ActivityIndicator color={COLORS.blue} style={{ marginTop: 40 }} />
        ) : (
          <Muted style={{ textAlign: "center", marginTop: 40 }}>
            This ladder isn&apos;t open for pre-registration.
          </Muted>
        )}
      </SafeAreaView>
    );
  }

  const cash = isCashLadder(option);
  const registered = registeredIds.has(option.preRegistrationId);

  const handlePreRegister = async () => {
    if (!isSignedIn) {
      navigation.navigate("Login");
      return;
    }
    setSubmitting(true);
    try {
      await preRegister(option.preRegistrationId);
      setShowDetails(false);
    } catch (error) {
      console.error("Failed to pre-register:", error);
      Alert.alert(
        "Couldn't pre-register",
        "Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave the list?",
      `You won't be notified when ${option.name} opens.`,
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leave(option.preRegistrationId);
            } catch (error) {
              console.error("Failed to leave pre-registration:", error);
              Alert.alert(
                "Couldn't leave the list",
                "Check your connection and try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleInvite = () =>
    Share.share({
      message: `I've pre-registered for the ${option.name} ${cash ? "Cash" : "Community"} Ladder on Court Champs. Join me: https://courtchamps.com`,
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#00152B" }}>
      <PreRegistrationHeader title={option.name} />
      {loading ? (
        <ActivityIndicator color={COLORS.blue} style={{ marginTop: 40 }} />
      ) : registered && !showDetails ? (
        <Confirmation
          option={option}
          onInvite={handleInvite}
          onShowDetails={() => setShowDetails(true)}
          onSeeOtherLadders={() => navigation.goBack()}
          onLeave={handleLeave}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <LadderDetails option={option} />

          {registered ? (
            <RegisteredNotice>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={COLORS.success}
              />
              <RegisteredText>You&apos;re on the list</RegisteredText>
            </RegisteredNotice>
          ) : (
            <>
              <CenteredMuted>
                {cash
                  ? `${formatCurrency(option.entryFee, option.currencyType)}* entry when it opens. Nothing to pay today.`
                  : "Free to enter. We'll let you know the moment it opens."}
              </CenteredMuted>
              <PrimaryButton
                testID="ladder-pre-registration-submit"
                cash={cash}
                disabled={submitting}
                onPress={handlePreRegister}
              >
                {submitting ? (
                  <ActivityIndicator color={cash ? COLORS.goldText : "white"} />
                ) : (
                  <PrimaryButtonText cash={cash}>
                    {isSignedIn ? "Pre-register" : "Sign in to pre-register"}
                  </PrimaryButtonText>
                )}
              </PrimaryButton>
            </>
          )}

          {cash ? <Footnote>{getPlatformFeeFootnote(option)}</Footnote> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const LadderDetails: React.FC<{ option: LadderPreRegistration }> = ({
  option,
}) => {
  const cash = isCashLadder(option);
  const noun = getEntrantNoun(option);
  const accent = cash ? COLORS.gold : COLORS.blue;

  return (
    <>
      <Hero cash={cash}>
        <Ionicons name={cash ? "trophy" : "ribbon"} size={32} color={accent} />
        <HeroAmount color={accent}>{formatPrizePool(option)}</HeroAmount>
        <Muted style={{ textAlign: "center" }}>
          {cash ? "Prize pool" : "Court Points to be won"} with a full ladder of{" "}
          {option.maxPlayers.toLocaleString("en-GB")} {noun}s
        </Muted>
      </Hero>

      {option.description ? (
        <Description>{option.description}</Description>
      ) : null}

      <SectionTitle>Prize breakdown</SectionTitle>
      <Panel testID="ladder-pre-registration-prize-table">
        <TableRow>
          <HeaderCell flex={1.6}>Finish</HeaderCell>
          {cash ? (
            <HeaderCell flex={1} align="right">
              Cash each
            </HeaderCell>
          ) : null}
          <HeaderCell flex={1} align="right">
            CP each
          </HeaderCell>
        </TableRow>
        {getFullLadderPrizeTable(option).map((row) => {
          const highlight = row.fromPlace === 1;
          return (
            <TableRow key={row.fromPlace}>
              <Cell flex={1.6} highlight={highlight}>
                {row.label}
              </Cell>
              {cash ? (
                <Cell flex={1} align="right" highlight={highlight}>
                  {formatCurrency(row.cash, option.currencyType)}
                </Cell>
              ) : null}
              <Cell flex={1} align="right" highlight={highlight}>
                {row.cp.toLocaleString("en-GB")}
              </Cell>
            </TableRow>
          );
        })}
      </Panel>

      <SectionTitle>
        The {cash ? "pool" : "CP pool"} grows with every {noun}
      </SectionTitle>
      <Panel>
        <TableRow>
          <HeaderCell flex={1}>
            {noun === "team" ? "Teams" : "Players"}
          </HeaderCell>
          <HeaderCell flex={1.2} align="right">
            {cash ? "Prize pool" : "CP pool"}
          </HeaderCell>
          <HeaderCell flex={1} align="right">
            Playoffs
          </HeaderCell>
          {cash ? (
            <HeaderCell flex={0.8} align="right">
              Paid
            </HeaderCell>
          ) : null}
        </TableRow>
        {getLadderSizeRows(option).map((row) => {
          const highlight = row.size === option.maxPlayers;
          return (
            <TableRow key={row.size}>
              <Cell flex={1} highlight={highlight}>
                {row.size.toLocaleString("en-GB")}
              </Cell>
              <Cell flex={1.2} align="right" highlight={highlight}>
                {row.prizePool}
              </Cell>
              <Cell flex={1} align="right" highlight={highlight}>
                Top {row.playoffSpots}
              </Cell>
              {cash ? (
                <Cell flex={0.8} align="right" highlight={highlight}>
                  {row.inTheMoney === row.playoffSpots
                    ? `All ${row.inTheMoney}`
                    : `Top ${row.inTheMoney}`}
                </Cell>
              ) : null}
            </TableRow>
          );
        })}
      </Panel>

      <SectionTitle>How a season works</SectionTitle>
      <Panel>
        <Timeline>
          {LADDER_SEASON_STAGES.map((stage) => (
            <Stage key={stage.key}>
              <Ionicons
                name={STAGE_ICONS[stage.key].icon}
                size={20}
                color={STAGE_ICONS[stage.key].color}
              />
              <StageLabel>{stage.label}</StageLabel>
              {stage.detail ? <StageDetail>{stage.detail}</StageDetail> : null}
            </Stage>
          ))}
        </Timeline>
      </Panel>

      {CLIMB_STEPS.map((step) => (
        <Step key={step.text}>
          <Ionicons name={step.icon} size={18} color={COLORS.blue} />
          <StepText>{step.text}</StepText>
        </Step>
      ))}
    </>
  );
};

const Confirmation: React.FC<{
  option: LadderPreRegistration;
  onInvite: () => void;
  onShowDetails: () => void;
  onSeeOtherLadders: () => void;
  onLeave: () => void;
}> = ({ option, onInvite, onShowDetails, onSeeOtherLadders, onLeave }) => {
  const cash = isCashLadder(option);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <ConfirmationTop>
        <SuccessCircle>
          <Ionicons name="checkmark" size={36} color={COLORS.success} />
        </SuccessCircle>
        <ConfirmationTitle>You&apos;re on the list</ConfirmationTitle>
        <CenteredMuted>
          We&apos;ll notify you in the app and email you the moment{" "}
          {option.name} opens, so you can grab your place early.
        </CenteredMuted>
      </ConfirmationTop>

      <Panel style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Ionicons name="people-outline" size={22} color={COLORS.blue} />
        <ConfirmationTextBlock>
          <InviteTitle>
            {cash
              ? "Bigger ladder, bigger prize"
              : "Bigger ladder, bigger rank"}
          </InviteTitle>
          <Muted>
            {cash
              ? "Every player who joins adds to the pool."
              : "Every player who joins adds CP to the pool."}
          </Muted>
        </ConfirmationTextBlock>
      </Panel>

      <PrimaryButton testID="ladder-pre-registration-invite" onPress={onInvite}>
        <PrimaryButtonText>Invite friends</PrimaryButtonText>
      </PrimaryButton>
      <OutlineButton onPress={onSeeOtherLadders}>
        <OutlineButtonText>See other ladders</OutlineButtonText>
      </OutlineButton>
      <TextButton onPress={onShowDetails}>
        <TextButtonLabel>View ladder details</TextButtonLabel>
      </TextButton>
      <TextButton testID="ladder-pre-registration-leave" onPress={onLeave}>
        <TextButtonLabel>Leave the list</TextButtonLabel>
      </TextButton>
    </ScrollView>
  );
};

const Description = styled.Text({
  color: COLORS.body,
  fontSize: 13,
  lineHeight: 19,
  marginTop: 12,
});

const Hero = styled.View<{ cash: boolean }>(({ cash }: { cash: boolean }) => ({
  backgroundColor: COLORS.hero,
  borderWidth: 1.5,
  borderColor: cash ? COLORS.gold : COLORS.blue,
  borderRadius: 14,
  alignItems: "center",
  paddingVertical: 16,
  paddingHorizontal: 12,
}));

const HeroAmount = styled.Text<{ color: string }>(
  ({ color }: { color: string }) => ({
    color,
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 2,
  }),
);

const SectionTitle = styled.Text({
  color: "white",
  fontSize: 13,
  fontWeight: "bold",
  marginTop: 16,
  marginBottom: 6,
});

const Panel = styled.View({
  backgroundColor: COLORS.panel,
  borderRadius: 14,
  paddingVertical: 8,
  paddingHorizontal: 10,
  marginBottom: 10,
});

const TableRow = styled.View({
  flexDirection: "row",
  paddingVertical: 4,
});

const HeaderCell = styled.Text<{ flex: number; align?: "right" }>(
  ({ flex, align }: { flex: number; align?: "right" }) => ({
    flex,
    textAlign: align ?? "left",
    color: COLORS.muted,
    fontSize: 12,
  }),
);

const Cell = styled.Text<{
  flex: number;
  align?: "right";
  highlight?: boolean;
}>(
  ({
    flex,
    align,
    highlight,
  }: {
    flex: number;
    align?: "right";
    highlight?: boolean;
  }) => ({
    flex,
    textAlign: align ?? "left",
    color: highlight ? COLORS.gold : "white",
    fontWeight: highlight ? "bold" : "normal",
    fontSize: 12,
  }),
);

const Timeline = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 4,
});

const Stage = styled.View({
  flex: 1,
  alignItems: "center",
});

const StageLabel = styled.Text({
  color: COLORS.body,
  fontSize: 11,
  marginTop: 3,
});

const StageDetail = styled.Text({
  color: COLORS.muted,
  fontSize: 10,
});

const Step = styled.View({
  flexDirection: "row",
  gap: 10,
  marginBottom: 8,
  paddingRight: 10,
});

const StepText = styled.Text({
  color: COLORS.body,
  fontSize: 13,
  lineHeight: 19,
  flex: 1,
});

const Muted = styled.Text({
  color: COLORS.muted,
  fontSize: 12,
});

const CenteredMuted = styled.Text({
  color: COLORS.muted,
  fontSize: 12,
  textAlign: "center",
  marginTop: 10,
  marginBottom: 12,
  lineHeight: 18,
});

const PrimaryButton = styled.TouchableOpacity<{ cash?: boolean }>(
  ({ cash }: { cash?: boolean }) => ({
    backgroundColor: cash ? COLORS.orange : COLORS.blue,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 6,
  }),
);

const PrimaryButtonText = styled.Text<{ cash?: boolean }>(
  ({ cash }: { cash?: boolean }) => ({
    color: cash ? COLORS.goldText : "white",
    fontSize: 15,
    fontWeight: "bold",
  }),
);

const OutlineButton = styled.TouchableOpacity({
  borderWidth: 1,
  borderColor: COLORS.blue,
  borderRadius: 10,
  paddingVertical: 13,
  alignItems: "center",
  marginTop: 10,
});

const OutlineButtonText = styled.Text({
  color: COLORS.blue,
  fontSize: 15,
  fontWeight: "bold",
});

const TextButton = styled.TouchableOpacity({
  alignItems: "center",
  paddingVertical: 10,
  marginTop: 4,
});

const TextButtonLabel = styled.Text({
  color: COLORS.muted,
  fontSize: 13,
});

const RegisteredNotice = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  marginTop: 12,
});

const RegisteredText = styled.Text({
  color: COLORS.success,
  fontSize: 14,
  fontWeight: "bold",
});

const ConfirmationTop = styled.View({
  alignItems: "center",
  paddingTop: 32,
  paddingBottom: 12,
});

const SuccessCircle = styled.View({
  width: 72,
  height: 72,
  borderRadius: 36,
  backgroundColor: COLORS.successTint,
  alignItems: "center",
  justifyContent: "center",
});

const ConfirmationTitle = styled.Text({
  color: "white",
  fontSize: 20,
  fontWeight: "bold",
  marginTop: 14,
});

const ConfirmationTextBlock = styled.View({
  flex: 1,
});

const InviteTitle = styled.Text({
  color: "white",
  fontSize: 13,
  fontWeight: "bold",
});

const Footnote = styled.Text({
  color: COLORS.muted,
  fontSize: 11,
  marginTop: 14,
  textAlign: "center",
});

export default LadderPreRegistrationSignup;
