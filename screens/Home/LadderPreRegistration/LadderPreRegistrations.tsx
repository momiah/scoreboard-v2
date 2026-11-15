import React, { useState } from "react";
import { ScrollView } from "react-native";
import SafeAreaView from "../../../components/SafeAreaView";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import styled from "styled-components/native";
import type { LadderPreRegistration } from "@shared/types";
import LineTabs from "../../../components/LineTabs";
import LadderTicket, {
  LadderTicketSkeleton,
} from "../../../components/ladder/LadderTicket";
import PreRegistrationHeader from "../../../components/LadderPreRegistration/PreRegistrationHeader";
import { useLadderPreRegistrations } from "../../../hooks/useLadderPreRegistrations";
import {
  LADDER_PRE_REGISTRATION_COLORS as COLORS,
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
    const registered = registeredIds.has(preRegistration.preRegistrationId);
    return (
      <LadderTicket
        key={preRegistration.preRegistrationId}
        testID={`ladder-pre-registration-option-${preRegistration.preRegistrationId}`}
        ladder={preRegistration}
        actionLabel={registered ? "You're in" : "Pre-register"}
        actionDone={registered}
        onPress={() =>
          navigation.navigate("LadderPreRegistrationSignup", {
            preRegistrationId: preRegistration.preRegistrationId,
          })
        }
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screen }}>
      <PreRegistrationHeader title="Ladders" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <LineTabs tabs={TABS} activeTab={activeTab} onTabPress={setActiveTab} />

        <TabContent>
          {loading ? (
            <>
              <LadderTicketSkeleton />
              <LadderTicketSkeleton />
            </>
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
          <Footnote>
            {`18+ only. ${getPlatformFeeFootnote(visible[0])}`}
          </Footnote>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const TabContent = styled.View({
  marginTop: 12,
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
