import React from "react";
import { ScrollView, View } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import FormattedBlocks from "./FormattedBlocks";
import { rulesFor } from "./ladderRulesContent";
import { ladderEntrantNoun } from "../../helpers/ladderEntrantNoun";

const LadderRulesView: React.FC<{
  ladderType?: string;
  onBack: () => void;
}> = ({ ladderType, onBack }) => {
  const rules = rulesFor(ladderEntrantNoun(ladderType));

  return (
    <Screen>
      <TopBar>
        <BackButton onPress={onBack} testID="ladder-rules-back">
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </BackButton>
        <TopBarTitle>Ladder Rules</TopBarTitle>
        <View style={{ width: 26 }} />
      </TopBar>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        {rules.map((rule) => (
          <RuleCard key={rule.title}>
            <RuleTitle>{rule.title}</RuleTitle>
            <FormattedBlocks blocks={rule.body} />
          </RuleCard>
        ))}
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

const RuleCard = styled.View({
  padding: 16,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  borderWidth: 1,
  borderColor: "#192336",
  gap: 8,
});

const RuleTitle = styled.Text({
  color: "#00A2FF",
  fontSize: 15,
  fontWeight: "bold",
});
