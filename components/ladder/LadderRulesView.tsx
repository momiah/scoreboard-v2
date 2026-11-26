import React from "react";
import { ScrollView, View } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { getLadderRules } from "@shared";

import LegalSections from "../legal/LegalSections";
import { ladderEntrantNoun } from "../../helpers/ladderEntrantNoun";

const LadderRulesView: React.FC<{
  ladderType?: string;
  onBack: () => void;
}> = ({ ladderType, onBack }) => {
  const rules = getLadderRules(ladderEntrantNoun(ladderType));

  return (
    <Screen>
      <TopBar>
        <BackButton onPress={onBack} testID="ladder-rules-back">
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </BackButton>
        <TopBarTitle>Ladder Rules</TopBarTitle>
        <View style={{ width: 26 }} />
      </TopBar>

      <ScrollView
        testID="ladder-rules-scroll"
        contentContainerStyle={{ padding: 20, gap: 20 }}
      >
        <LegalSections sections={rules} testIDPrefix="ladder-rules" />
      </ScrollView>
    </Screen>
  );
};

export default LadderRulesView;

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
