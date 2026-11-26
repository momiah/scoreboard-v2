import React from "react";
import { Linking, ScrollView, View } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { PRIVACY_POLICY_URL, TERMS_OF_USE, TERMS_OF_USE_INTRO } from "@shared";

import LegalSections from "../../components/legal/LegalSections";

const TermsOfUse = ({ navigation }: { navigation: { goBack: () => void } }) => (
  <Screen>
    <TopBar>
      <BackButton onPress={() => navigation.goBack()} testID="terms-of-use-back">
        <Ionicons name="chevron-back" size={26} color="#ffffff" />
      </BackButton>
      <TopBarTitle>Terms of Use</TopBarTitle>
      <View style={{ width: 26 }} />
    </TopBar>

    <ScrollView
      testID="terms-of-use-scroll"
      contentContainerStyle={{ padding: 20, gap: 20 }}
    >
      <LegalSections
        intro={TERMS_OF_USE_INTRO}
        sections={TERMS_OF_USE}
        testIDPrefix="terms-of-use"
      />
      <PrivacyLink
        testID="terms-of-use-privacy-link"
        onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
      >
        <PrivacyText>Read our Privacy Policy</PrivacyText>
        <Ionicons name="open-outline" size={16} color="#00A2FF" />
      </PrivacyLink>
    </ScrollView>
  </Screen>
);

export default TermsOfUse;

const Screen = styled.View({
  flex: 1,
  backgroundColor: "#00152B",
});

const TopBar = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 15,
  paddingVertical: 15,
});

const BackButton = styled.TouchableOpacity({
  padding: 2,
});

const TopBarTitle = styled.Text({
  color: "#ffffff",
  fontSize: 18,
  fontWeight: "bold",
});

const PrivacyLink = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  paddingVertical: 12,
});

const PrivacyText = styled.Text({
  color: "#00A2FF",
  fontSize: 14,
  fontWeight: "bold",
});
