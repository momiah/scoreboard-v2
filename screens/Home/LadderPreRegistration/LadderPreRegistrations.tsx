import React, { useState } from "react";
import { ScrollView, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { socialMediaPlatforms, ICON_MAP } from "@shared";
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
import { handleSocialPress } from "../../../helpers/handleSocialPress";
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
          ) : visible.length === 0 && activeTab === "community" ? (
            <CommunityEmpty testID="ladder-pre-registration-community-empty">
              <EmptyText style={{ marginTop: 0 }}>
                There are no free Community Ladders yet. Follow us to be updated
                on launches 🚀
              </EmptyText>
              <FollowIcons>
                {socialMediaPlatforms.map((platform) => (
                  <TouchableOpacity
                    key={platform}
                    onPress={() => handleSocialPress(platform)}
                    hitSlop={8}
                    testID={`ladder-pre-registration-follow-${platform.toLowerCase()}`}
                    accessibilityRole="link"
                    accessibilityLabel={`Follow Court Champs on ${platform}`}
                  >
                    <Ionicons
                      name={ICON_MAP[platform as keyof typeof ICON_MAP]}
                      size={28}
                      color="#00A2FF"
                    />
                  </TouchableOpacity>
                ))}
              </FollowIcons>
            </CommunityEmpty>
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

const CommunityEmpty = styled.View({
  alignItems: "center",
  marginTop: 24,
  gap: 16,
});

const FollowIcons = styled.View({
  flexDirection: "row",
  justifyContent: "center",
  gap: 24,
});

const Footnote = styled.Text({
  color: COLORS.muted,
  fontSize: 11,
  marginTop: 8,
});

export default LadderPreRegistrations;
