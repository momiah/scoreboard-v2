import React from "react";
import { ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import LadderTermsList from "../../../components/ladder/LadderTermsContent";

const LadderTerms: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <Screen>
      <TopBar>
        <BackButton
          onPress={() => navigation.goBack()}
          testID="ladder-terms-back"
        >
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </BackButton>
        <TopBarTitle>Terms &amp; Conditions</TopBarTitle>
        <View style={{ width: 26 }} />
      </TopBar>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <LadderTermsList />
      </ScrollView>
    </Screen>
  );
};

export default LadderTerms;

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
