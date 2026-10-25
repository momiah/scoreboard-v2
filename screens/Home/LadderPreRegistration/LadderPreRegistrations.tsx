import React, { useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView } from "react-native";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { LadderPreRegistration } from "@shared/types";
import LineTabs from "../../../components/LineTabs";
import PreRegistrationHeader from "../../../components/LadderPreRegistration/PreRegistrationHeader";
import { useLadderPreRegistrations } from "../../../hooks/useLadderPreRegistrations";
import {
  LADDER_PRE_REGISTRATION_COLORS as COLORS,
  formatEntryFee,
  formatPrizePool,
  getLadderSummary,
  getPlatformFeeFootnote,
  isCashLadder,
} from "../../../helpers/ladderPreRegistrationDisplay";

type LadderTab = "cash" | "community";

const TABS: { key: LadderTab; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "community", label: "Community" },
];

const LadderPreRegistrations: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { loading, preRegistrations, registeredIds } =
    useLadderPreRegistrations();
  const [activeTab, setActiveTab] = useState<LadderTab>("cash");

  const visible = preRegistrations.filter((preRegistration) =>
    activeTab === "cash"
      ? isCashLadder(preRegistration)
      : !isCashLadder(preRegistration),
  );

  const renderLadder = (preRegistration: LadderPreRegistration) => {
    const cash = isCashLadder(preRegistration);
    const registered = registeredIds.has(preRegistration.preRegistrationId);

    return (
      <LadderCard
        key={preRegistration.preRegistrationId}
        testID={`ladder-pre-registration-option-${preRegistration.preRegistrationId}`}
        cash={cash}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("LadderPreRegistrationSignup", {
            preRegistrationId: preRegistration.preRegistrationId,
          })
        }
      >
        <CardTopRow>
          <Pill cash={cash}>
            <PillText cash={cash}>
              {cash
                ? `${formatPrizePool(preRegistration)} prize pool`
                : `${formatPrizePool(preRegistration)} to be won`}
            </PillText>
          </Pill>
          <Muted>{formatEntryFee(preRegistration)}</Muted>
        </CardTopRow>
        <LadderName>{preRegistration.name}</LadderName>
        <Muted>
          {preRegistration.region} · {getLadderSummary(preRegistration)}
        </Muted>
        <CardBottomRow>
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
            color={cash ? COLORS.prizeGold : COLORS.blue}
          />
        </CardBottomRow>
      </LadderCard>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screen }}>
      <PreRegistrationHeader title="Ladders" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <HowToPlayButton
          testID="ladder-pre-registration-how-to-play"
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate("LadderPreRegistrationHowToPlay", {
              preRegistrationId: visible[0]?.preRegistrationId,
            })
          }
        >
          <Ionicons name="book-outline" size={16} color="white" />
          <HowToPlayText>How to play</HowToPlayText>
        </HowToPlayButton>

        <LineTabs tabs={TABS} activeTab={activeTab} onTabPress={setActiveTab} />

        <TabContent>
          {loading ? (
            <ActivityIndicator color={COLORS.blue} style={{ marginTop: 24 }} />
          ) : visible.length === 0 ? (
            <EmptyText>
              No {activeTab === "cash" ? "Cash" : "Community"} Ladders are open
              for pre-registration right now. Check back soon.
            </EmptyText>
          ) : (
            visible.map(renderLadder)
          )}
        </TabContent>

        {activeTab === "cash" && visible[0] ? (
          <Footnote>{getPlatformFeeFootnote(visible[0])}</Footnote>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const HowToPlayButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  backgroundColor: COLORS.blue,
  borderRadius: 12,
  paddingVertical: 15,
  marginBottom: 12,
});

const HowToPlayText = styled.Text({
  color: "white",
  fontSize: 15,
  fontWeight: "bold",
});

const TabContent = styled.View({
  marginTop: 12,
});

const LadderCard = styled.TouchableOpacity<{ cash: boolean }>(
  ({ cash }: { cash: boolean }) => ({
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: cash ? COLORS.prizeGoldBorder : COLORS.blueBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  }),
);

const CardTopRow = styled.View({
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
    color: cash ? COLORS.prizeGold : COLORS.blue,
    fontSize: 11,
    fontWeight: "bold",
  }),
);

const LadderName = styled.Text({
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

const CardBottomRow = styled.View({
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

const EmptyText = styled.Text({
  color: COLORS.muted,
  fontSize: 13,
  textAlign: "center",
  marginTop: 24,
});

const Footnote = styled.Text({
  color: COLORS.muted,
  fontSize: 11,
  marginTop: 8,
});

export default LadderPreRegistrations;
