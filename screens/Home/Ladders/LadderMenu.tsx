import React, { useContext } from "react";
import { View, Alert, StyleSheet } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";

import { PopupContext } from "../../../context/PopupContext";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type LadderMenuAction = "LadderRules" | "LadderTerms" | "LeaveLadder";

interface LadderMenuParams {
  ladderId: string;
}

interface MenuOption {
  label: string;
  icon: IoniconName;
  action: LadderMenuAction;
  color?: string;
}

const MENU_OPTIONS: MenuOption[] = [
  { label: "Rules", icon: "book-outline", action: "LadderRules" },
  {
    label: "Terms & Conditions",
    icon: "document-text-outline",
    action: "LadderTerms",
  },
  {
    label: "Leave Ladder",
    icon: "exit-outline",
    action: "LeaveLadder",
    color: "#FF4B6E",
  },
];

const LadderMenu: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, LadderMenuParams>, string>>();
  const { ladderId } = route.params;
  const { showBottomToast } = useContext(PopupContext);

  const handleLeaveLadder = () => {
    Alert.alert(
      "Leave Ladder",
      "Are you sure you want to leave this ladder? You'll need to rejoin to take part again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () =>
            showBottomToast("Leaving a ladder is coming soon", "info"),
        },
      ],
    );
  };

  const handlePress = (action: LadderMenuAction) => {
    if (action === "LeaveLadder") {
      handleLeaveLadder();
      return;
    }
    navigation.navigate(action, { ladderId });
  };

  return (
    <Container>
      <Header>
        <BackButton
          onPress={() => navigation.goBack()}
          testID="ladder-menu-back"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </BackButton>
        <HeaderTitle>Ladder Menu</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>

      <MenuList>
        {MENU_OPTIONS.map((option) => (
          <MenuItem
            key={option.label}
            onPress={() => handlePress(option.action)}
            testID={`ladder-menu-${option.action}`}
          >
            <LeftContainer>
              <Ionicons
                name={option.icon}
                size={20}
                color={option.color ?? "white"}
              />
              <MenuText style={{ color: option.color ?? "white" }}>
                {option.label}
              </MenuText>
            </LeftContainer>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </MenuItem>
        ))}
      </MenuList>
    </Container>
  );
};

export default LadderMenu;

const Container = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  padding: 20,
});

const Header = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 30,
});

const BackButton = styled.TouchableOpacity({});

const HeaderTitle = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const MenuList = styled.View({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 12,
  paddingVertical: 10,
});

const MenuItem = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 15,
  paddingHorizontal: 20,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: "rgba(255, 255, 255, 0.1)",
});

const LeftContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 15,
});

const MenuText = styled.Text({
  color: "white",
  fontSize: 16,
});
