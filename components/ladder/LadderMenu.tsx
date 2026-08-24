import React, { useState } from "react";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";

interface LadderMenuProps {
  ladderId: string;
}

// Burger menu overlaid on the ladder header image. Holds the Rules and
// Terms & Conditions shortcuts.
const LadderMenu: React.FC<LadderMenuProps> = ({ ladderId }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [open, setOpen] = useState(false);

  const go = (route: string) => {
    setOpen(false);
    navigation.navigate(route, { ladderId });
  };

  return (
    <>
      <OverlayTop>
        <IconButton
          activeOpacity={0.8}
          onPress={() => setOpen((prev) => !prev)}
          testID="ladder-burger"
        >
          <Ionicons name="menu" size={24} color="#ffffff" />
        </IconButton>
      </OverlayTop>

      {open && (
        <Menu testID="ladder-menu">
          <MenuItem
            activeOpacity={0.7}
            onPress={() => go("LadderRules")}
            testID="ladder-menu-rules"
          >
            <Ionicons name="book-outline" size={16} color="#ffffff" />
            <MenuItemText>Rules</MenuItemText>
          </MenuItem>
          <MenuItem
            activeOpacity={0.7}
            onPress={() => go("LadderTerms")}
            testID="ladder-menu-terms"
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
    </>
  );
};

export default LadderMenu;

const OverlayTop = styled.View({
  position: "absolute",
  top: 15,
  right: 15,
  zIndex: 5,
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
  top: 60,
  right: 15,
  zIndex: 10,
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
