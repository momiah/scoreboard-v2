import React from "react";
import { ActivityIndicator, SafeAreaView, ScrollView } from "react-native";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { LadderPreRegistration } from "@shared/types";
import PreRegistrationHeader from "../../../components/LadderPreRegistration/PreRegistrationHeader";
import { useLadderPreRegistrations } from "../../../hooks/useLadderPreRegistrations";
import {
  LADDER_PRE_REGISTRATION_COLORS as COLORS,
  LADDER_SEASON_EXPLAINER,
  formatEntryFee,
  formatPrizePool,
  getLadderSummary,
  getPlatformFeeFootnote,
  isCashLadder,
} from "../../../helpers/ladderPreRegistrationDisplay";

const LadderPreRegistrations: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { loading, preRegistrations, registeredIds } =
    useLadderPreRegistrations();
  const cashOptions = preRegistrations.filter(isCashLadder);
  const communityOptions = preRegistrations.filter(
    (option) => !isCashLadder(option),
  );

  const renderOption = (option: LadderPreRegistration) => {
    const cash = isCashLadder(option);
    const registered = registeredIds.has(option.preRegistrationId);

    return (
      <OptionCard
        key={option.preRegistrationId}
        testID={`ladder-pre-registration-option-${option.preRegistrationId}`}
        cash={cash}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("LadderPreRegistrationSignup", {
            preRegistrationId: option.preRegistrationId,
          })
        }
      >
        <OptionTopRow>
          <Pill cash={cash}>
            <PillText cash={cash}>
              {cash
                ? `${formatPrizePool(option)} prize pool`
                : `${formatPrizePool(option)} to be won`}
            </PillText>
          </Pill>
          <Muted>{formatEntryFee(option)}</Muted>
        </OptionTopRow>
        <OptionName>{option.name}</OptionName>
        <Muted>
          {option.region} · {getLadderSummary(option)}
        </Muted>
        {option.description ? (
          <Description>{option.description}</Description>
        ) : null}
        <OptionBottomRow>
          {registered ? (
            <Registered>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={COLORS.success}
              />
              <RegisteredText>Pre-registered</RegisteredText>
            </Registered>
          ) : (
            <Muted>Pre-register</Muted>
          )}
          <Ionicons
            name="chevron-forward"
            size={18}
            color={cash ? COLORS.orange : COLORS.blue}
          />
        </OptionBottomRow>
      </OptionCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#00152B" }}>
      <PreRegistrationHeader title="Ladders" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Explainer>
          <ExplainerTitle>What&apos;s a ladder?</ExplainerTitle>
          <ExplainerText>{LADDER_SEASON_EXPLAINER}</ExplainerText>
        </Explainer>

        {loading ? (
          <ActivityIndicator color={COLORS.blue} style={{ marginTop: 24 }} />
        ) : preRegistrations.length === 0 ? (
          <EmptyText>
            No ladders are open for pre-registration right now. Check back soon.
          </EmptyText>
        ) : null}

        {cashOptions.length > 0 ? (
          <>
            <SectionTitle color={COLORS.gold}>
              <Ionicons name="cash-outline" size={14} color={COLORS.gold} />{" "}
              Cash Ladders
            </SectionTitle>
            {cashOptions.map(renderOption)}
          </>
        ) : null}

        {communityOptions.length > 0 ? (
          <>
            <SectionTitle color={COLORS.blue}>
              <Ionicons name="trophy-outline" size={14} color={COLORS.blue} />{" "}
              Community Ladders
            </SectionTitle>
            {communityOptions.map(renderOption)}
          </>
        ) : null}

        {cashOptions[0] ? (
          <Footnote>{getPlatformFeeFootnote(cashOptions[0])}</Footnote>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const Description = styled.Text({
  color: COLORS.body,
  fontSize: 12,
  lineHeight: 17,
  marginTop: 6,
});

const EmptyText = styled.Text({
  color: COLORS.muted,
  fontSize: 13,
  textAlign: "center",
  marginTop: 24,
});

const Explainer = styled.View({
  backgroundColor: COLORS.panel,
  borderRadius: 14,
  padding: 12,
});

const ExplainerTitle = styled.Text({
  color: "white",
  fontSize: 13,
  fontWeight: "bold",
  marginBottom: 4,
});

const ExplainerText = styled.Text({
  color: COLORS.body,
  fontSize: 12,
  lineHeight: 18,
});

const SectionTitle = styled.Text<{ color: string }>(
  ({ color }: { color: string }) => ({
    color,
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 8,
  }),
);

const OptionCard = styled.TouchableOpacity<{ cash: boolean }>(
  ({ cash }: { cash: boolean }) => ({
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: cash ? COLORS.orange : COLORS.blueBorder,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  }),
);

const OptionTopRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});

const Pill = styled.View<{ cash: boolean }>(({ cash }: { cash: boolean }) => ({
  backgroundColor: cash ? COLORS.goldTint : COLORS.blueTint,
  borderRadius: 20,
  paddingHorizontal: 9,
  paddingVertical: 3,
}));

const PillText = styled.Text<{ cash: boolean }>(
  ({ cash }: { cash: boolean }) => ({
    color: cash ? COLORS.gold : COLORS.blue,
    fontSize: 11,
    fontWeight: "bold",
  }),
);

const OptionName = styled.Text({
  color: "white",
  fontSize: 16,
  fontWeight: "bold",
  marginTop: 8,
  marginBottom: 2,
});

const Muted = styled.Text({
  color: COLORS.muted,
  fontSize: 12,
});

const OptionBottomRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 8,
});

const Registered = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
});

const RegisteredText = styled.Text({
  color: COLORS.success,
  fontSize: 12,
  fontWeight: "bold",
});

const Footnote = styled.Text({
  color: COLORS.muted,
  fontSize: 11,
  marginTop: 8,
});

export default LadderPreRegistrations;
