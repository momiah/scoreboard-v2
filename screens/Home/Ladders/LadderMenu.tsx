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

import { LADDER_TYPE, notificationSchema, notificationTypes } from "@shared";
import { PopupContext } from "../../../context/PopupContext";
import { LadderContext } from "../../../context/LadderContext";
import { UserContext } from "../../../context/UserContext";
import { formatDisplayName } from "../../../helpers/formatDisplayName";
import type { LeaveLadderOutcome } from "../../../context/types/LadderContextType";

const LEAVE_BLOCKED: Record<
  NonNullable<LeaveLadderOutcome["reason"]>,
  string
> = {
  registration_closed: "You can't leave once registration has closed.",
  played: "You can't leave after playing a game in this ladder.",
  open_match: "Cancel your posted or accepted matches before leaving.",
  not_joined: "You're not in this ladder.",
  error: "Something went wrong. Please try again.",
};

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type LadderMenuAction =
  "LadderPostedMatches" | "LadderRules" | "LadderTerms" | "LeaveLadder";

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
  {
    label: "Current Posted Matches",
    icon: "calendar-outline",
    action: "LadderPostedMatches",
  },
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
  const route = useRoute<RouteProp<Record<string, LadderMenuParams>, string>>();
  const { ladderId } = route.params;
  const { showBottomToast } = useContext(PopupContext);
  const { ladderById, leaveLadder } = useContext(LadderContext);
  const { currentUser, sendNotification } = useContext(UserContext);
  const isDoubles = ladderById?.ladderType === LADDER_TYPE.DOUBLES;

  const leave = async () => {
    if (!currentUser?.userId) return;
    const outcome = await leaveLadder(ladderId, currentUser.userId);
    if (!outcome.success) {
      showBottomToast(LEAVE_BLOCKED[outcome.reason ?? "error"], "error");
      return;
    }
    await Promise.all(
      (outcome.notifyUserIds ?? []).map((recipientId) =>
        sendNotification({
          ...notificationSchema,
          createdAt: new Date(),
          recipientId,
          senderId: currentUser.userId,
          message: `${formatDisplayName(currentUser)} took your team out of ${ladderById?.name ?? "the ladder"}.`,
          type: notificationTypes.INFORMATION.LADDER.TYPE,
          data: { ladderId, tab: "Summary" },
        }).catch((error: unknown) =>
          console.error("Error sending leave notification:", error),
        ),
      ),
    );
    showBottomToast("You've left the ladder", "success");
    navigation.goBack();
  };

  const handleLeaveLadder = () => {
    Alert.alert(
      "Leave Ladder",
      isDoubles
        ? "Take your team out of this ladder? Your partner will be told, and you'll need to rejoin to take part again. Entry fees are refunded as set out in the Terms."
        : "Leave this ladder? You'll be removed from the standings and need to rejoin to take part again. Entry fees are refunded as set out in the Terms.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: leave },
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
