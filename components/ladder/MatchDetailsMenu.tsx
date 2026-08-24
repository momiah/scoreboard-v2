import React, { useState } from "react";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";

interface MatchDetailsMenuProps {
  ladderId: string;
}

// Burger menu for the match details screen. Currently surfaces the ladder's
// Rules and Terms & Conditions; drop match-specific actions in here later.
const MatchDetailsMenu: React.FC<MatchDetailsMenuProps> = ({ ladderId }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [open, setOpen] = useState(false);

  const go = (route: string) => {
    setOpen(false);
    navigation.navigate(route, { ladderId });
  };

  return (
    <MenuRoot>
      <IconButton
        activeOpacity={0.8}
        onPress={() => setOpen((prev) => !prev)}
        testID="match-details-burger"
      >
        <Ionicons name="menu" size={24} color="#ffffff" />
      </IconButton>

      {open && (
        <Menu testID="match-details-menu">
          <MenuItem
            activeOpacity={0.7}
            onPress={() => go("LadderRules")}
            testID="match-details-menu-rules"
          >
            <Ionicons name="book-outline" size={16} color="#ffffff" />
            <MenuItemText>Rules</MenuItemText>
          </MenuItem>
          <MenuItem
            activeOpacity={0.7}
            onPress={() => go("LadderTerms")}
            testID="match-details-menu-terms"
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color="#ffffff"
            />
            <MenuItemText>Terms &amp; Conditions</MenuItemText>
          </MenuItem>
        </Menu>
      )}
    </MenuRoot>
  );
};

export default MatchDetailsMenu;

const MenuRoot = styled.View({
  position: "relative",
  alignItems: "flex-end",
  zIndex: 20,
});

const IconButton = styled.TouchableOpacity({
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: "center",
  justifyContent: "center",
});

const Menu = styled.View({
  position: "absolute",
  top: 44,
  right: 0,
  zIndex: 20,
  minWidth: 150,
  borderRadius: 10,
  paddingVertical: 6,
  backgroundColor: "#0A1F33",
  borderWidth: 1,
  borderColor: "#192336",
});

const MenuItem = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  paddingHorizontal: 14,
  paddingVertical: 10,
});

const MenuItemText = styled.Text({
  color: "#ffffff",
  fontSize: 14,
});
