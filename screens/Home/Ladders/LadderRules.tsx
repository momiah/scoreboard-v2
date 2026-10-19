import React, { useContext } from "react";
import { ScrollView, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";

import FormattedBlocks from "../../../components/ladder/FormattedBlocks";
import { rulesFor } from "../../../components/ladder/ladderRulesContent";
import { LadderContext } from "../../../context/LadderContext";
import { ladderEntrantNoun } from "../../../helpers/ladderEntrantNoun";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

const LadderRules: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, { ladderId?: string }>, string>>();
  const { ladderById } = useContext(LadderContext);
  const ladderType =
    ladderById && ladderById.ladderId === route.params?.ladderId
      ? ladderById.ladderType
      : undefined;
  const rules = rulesFor(ladderEntrantNoun(ladderType));

  return (
    <Screen>
      <TopBar>
        <BackButton
          onPress={() => navigation.goBack()}
          testID="ladder-rules-back"
        >
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

export default LadderRules;

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
