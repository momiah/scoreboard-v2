import React, { useContext } from "react";
import { View, Alert, Linking, StyleSheet } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";

import type { LadderMatch, LadderType } from "@shared/types";

import { PopupContext } from "../../../context/PopupContext";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// TODO: confirm the live support address before release.
const SUPPORT_EMAIL = "support@courtchamps.com";

type MatchMenuAction =
  | "LadderRules"
  | "LadderTerms"
  | "RescheduleMatch"
  | "Support"
  | "CancelMatch";

interface MatchDetailsMenuParams {
  ladderId: string;
  matchId: string;
  match?: LadderMatch;
  ladderType?: LadderType;
}

interface MenuOption {
  label: string;
  icon: IoniconName;
  action: MatchMenuAction;
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
    label: "Reschedule Match",
    icon: "calendar-outline",
    action: "RescheduleMatch",
  },
  { label: "Support", icon: "help-buoy-outline", action: "Support" },
  {
    label: "Cancel Match",
    icon: "close-circle-outline",
    action: "CancelMatch",
    color: "#FF4B6E",
  },
];

const MatchDetailsMenu: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, MatchDetailsMenuParams>, string>>();
  const { ladderId } = route.params;
  const { showBottomToast } = useContext(PopupContext);

  const handleReschedule = () => {
    // TODO: wire up rescheduleMatch once the backend action exists.
    showBottomToast("Rescheduling a match is coming soon", "info");
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Match",
      "Are you sure you want to cancel this match? This cannot be undone.",
      [
        { text: "Keep Match", style: "cancel" },
        {
          text: "Cancel Match",
          style: "destructive",
          // TODO: wire up cancelMatch once the backend action exists.
          onPress: () =>
            showBottomToast("Cancelling a match is coming soon", "info"),
        },
      ],
    );
  };

  const handleSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch((err) =>
      console.error("Error opening support email:", err),
    );
  };

  const handlePress = (action: MatchMenuAction) => {
    switch (action) {
      case "LadderRules":
      case "LadderTerms":
        navigation.navigate(action, { ladderId });
        return;
      case "RescheduleMatch":
        handleReschedule();
        return;
      case "Support":
        handleSupport();
        return;
      case "CancelMatch":
        handleCancel();
        return;
      default:
        return;
    }
  };

  return (
    <Container>
      <Header>
        <BackButton
          onPress={() => navigation.goBack()}
          testID="match-menu-back"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </BackButton>
        <HeaderTitle>Match Options</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>

      <MenuList>
        {MENU_OPTIONS.map((option) => (
          <MenuItem
            key={option.label}
            onPress={() => handlePress(option.action)}
            testID={`match-menu-${option.action}`}
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

export default MatchDetailsMenu;

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
