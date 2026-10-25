import React from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
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
import RegistrantAvatars from "../../../components/LadderPreRegistration/RegistrantAvatars";
import {
  useLadderPreRegistrants,
  useLadderPreRegistrations,
} from "../../../hooks/useLadderPreRegistrations";
import {
  LADDER_PRE_REGISTRATION_COLORS as COLORS,
  formatPrizePool,
  getEntrantNoun,
  getFullLadderPrizeTable,
  getPlatformFeeFootnote,
  isCashLadder,
} from "../../../helpers/ladderPreRegistrationDisplay";

type SignupRoute = RouteProp<
  { LadderPreRegistrationSignup: { preRegistrationId: string } },
  "LadderPreRegistrationSignup"
>;

const AVATAR_PREVIEW_SIZE = 10;

const LadderPreRegistrationSignup: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { params } = useRoute<SignupRoute>();
  const { loading, preRegistrations, registeredIds, leave } =
    useLadderPreRegistrations();
  const { registrants, total } = useLadderPreRegistrants(
    params?.preRegistrationId,
    AVATAR_PREVIEW_SIZE,
  );
  const option = preRegistrations.find(
    (preRegistration) =>
      preRegistration.preRegistrationId === params?.preRegistrationId,
  );

  if (!option) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screen }}>
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screen }}>
      <PreRegistrationHeader title={option.name} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <LadderDetails option={option} />

        <StatusRow>
          <RegistrantAvatars
            registrants={registrants}
            total={total}
            noun={getEntrantNoun(option)}
          />
          {registered ? (
            <RegisteredNotice testID="ladder-pre-registration-registered">
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={COLORS.success}
              />
              <RegisteredText>You&apos;re on the list</RegisteredText>
            </RegisteredNotice>
          ) : null}
        </StatusRow>

        <HowToPlayButton
          testID="ladder-pre-registration-how-to-play"
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate("LadderPreRegistrationHowToPlay", {
              preRegistrationId: option.preRegistrationId,
            })
          }
        >
          <Ionicons name="book-outline" size={16} color="white" />
          <HowToPlayText>How to play</HowToPlayText>
        </HowToPlayButton>

        {registered ? null : (
          <CenteredMuted>
            {cash
              ? `${formatCurrency(option.entryFee, option.currencyType)}* entry when it opens. Pre-register at the end of the guide; nothing to pay today.`
              : "Free to enter. Pre-register at the end of the guide."}
          </CenteredMuted>
        )}

        <LinksRow>
          <TextLink
            testID="ladder-pre-registration-rules"
            onPress={() =>
              navigation.navigate("LadderPreRegistrationRules", {
                ladderType: option.ladderType,
              })
            }
          >
            <TextLinkLabel>Ladder rules</TextLinkLabel>
          </TextLink>
          <Muted>·</Muted>
          <TextLink
            testID="ladder-pre-registration-terms"
            onPress={() => navigation.navigate("LadderPreRegistrationTerms")}
          >
            <TextLinkLabel>Terms &amp; Conditions</TextLinkLabel>
          </TextLink>
          {registered ? (
            <>
              <Muted>·</Muted>
              <TextLink
                testID="ladder-pre-registration-leave"
                onPress={handleLeave}
              >
                <TextLinkLabel danger>Leave the list</TextLinkLabel>
              </TextLink>
            </>
          ) : null}
        </LinksRow>

        {cash ? <Footnote>{getPlatformFeeFootnote(option)}</Footnote> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const LadderDetails: React.FC<{ option: LadderPreRegistration }> = ({
  option,
}) => {
  const cash = isCashLadder(option);
  const noun = getEntrantNoun(option);

  return (
    <>
      <PrizePotCard>
        <PrizePotTitle>
          {cash ? "Total Prize Pool" : "Court Points to be won"}
        </PrizePotTitle>
        <PrizePotValue testID="ladder-pre-registration-pot">
          {formatPrizePool(option)}
        </PrizePotValue>
        <Muted>
          With a full ladder of {option.maxPlayers.toLocaleString("en-GB")}{" "}
          {noun}s
        </Muted>
      </PrizePotCard>

      <SectionTitle>Prize breakdown</SectionTitle>
      <Table testID="ladder-pre-registration-prize-table">
        <HeaderRow>
          <PlaceCell>
            <HeaderText>Finish</HeaderText>
          </PlaceCell>
          {cash ? (
            <ValueCell>
              <HeaderText>Cash Payout</HeaderText>
            </ValueCell>
          ) : null}
          <ValueCell last>
            <HeaderText>CP Payout</HeaderText>
          </ValueCell>
        </HeaderRow>
        {getFullLadderPrizeTable(option).map((row) => (
          <Row key={row.fromPlace}>
            <PlaceCell>
              <Place>{row.label}</Place>
            </PlaceCell>
            {cash ? (
              <ValueCell>
                <Value highlight>
                  {formatCurrency(row.cash, option.currencyType)}
                </Value>
              </ValueCell>
            ) : null}
            <ValueCell last>
              <Value>{row.cp.toLocaleString("en-GB")}</Value>
            </ValueCell>
          </Row>
        ))}
      </Table>
      <TableNote>
        {`The prize pool depends on how many ${noun}s sign up. Payouts shown are for a full ladder of ${option.maxPlayers.toLocaleString("en-GB")} ${noun}s.`}
      </TableNote>
    </>
  );
};

const PrizePotCard = styled.View({
  padding: 20,
  borderRadius: 14,
  backgroundColor: COLORS.card,
  borderWidth: 1,
  borderColor: COLORS.blueBorder,
  alignItems: "center",
  gap: 6,
});

const PrizePotTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "#ffffff",
});

const PrizePotValue = styled.Text({
  fontSize: 34,
  fontWeight: "bold",
  color: COLORS.prizeGold,
});

const SectionTitle = styled.Text({
  color: "white",
  fontSize: 13,
  fontWeight: "bold",
  marginTop: 16,
  marginBottom: 6,
});

const Table = styled.View({
  borderRadius: 12,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: COLORS.rowBorder,
});

const HeaderRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  backgroundColor: COLORS.tableHeader,
});

const Row = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  borderTopWidth: 1,
  borderColor: COLORS.rowBorder,
});

const PlaceCell = styled.View({
  width: 110,
  justifyContent: "center",
  paddingVertical: 14,
  paddingLeft: 12,
});

const ValueCell = styled.View<{ last?: boolean }>(
  ({ last }: { last?: boolean }) => ({
    width: last ? 84 : 96,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingRight: last ? 12 : 0,
  }),
);

const HeaderText = styled.Text({
  fontSize: 12,
  fontWeight: "bold",
  color: COLORS.muted,
});

const Place = styled.Text({
  fontSize: 14,
  fontWeight: "bold",
  color: COLORS.blue,
});

const Value = styled.Text<{ highlight?: boolean }>(
  ({ highlight }: { highlight?: boolean }) => ({
    fontSize: 14,
    fontWeight: "bold",
    color: highlight ? COLORS.prizeGold : "white",
  }),
);

const TableNote = styled.Text({
  color: COLORS.muted,
  fontSize: 11,
  marginTop: 8,
  lineHeight: 16,
});

const HowToPlayButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  backgroundColor: COLORS.blue,
  borderRadius: 12,
  paddingVertical: 15,
  marginTop: 16,
});

const HowToPlayText = styled.Text({
  color: "white",
  fontSize: 15,
  fontWeight: "bold",
});

const StatusRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 16,
});

const LinksRow = styled.View({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
  marginTop: 14,
});

const TextLink = styled.TouchableOpacity({
  paddingVertical: 4,
});

const TextLinkLabel = styled.Text<{ danger?: boolean }>(
  ({ danger }: { danger?: boolean }) => ({
    color: danger ? COLORS.danger : COLORS.blue,
    fontSize: 13,
  }),
);

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

const RegisteredNotice = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
});

const RegisteredText = styled.Text({
  color: COLORS.success,
  fontSize: 14,
  fontWeight: "bold",
});

const Footnote = styled.Text({
  color: COLORS.muted,
  fontSize: 11,
  marginTop: 14,
  textAlign: "center",
});

export default LadderPreRegistrationSignup;
