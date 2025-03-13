// ProfileMenu.js
import React, { useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { UserContext } from "../../context/UserContext";

const ProfileMenu = ({ navigation }) => {
  const { Logout } = useContext(UserContext);
  const menuOptions = [
    { label: "Edit Profile", icon: "create-outline", action: "EditProfile" },
    { label: "Log out", icon: "log-out-outline", action: "logout" },
  ];

  const handlePress = (action) => {
    if (action === "logout") {
      Logout();
      console.log("Logging out...");
    } else {
      navigation.navigate(action);
    }
  };

  return (
    <Container>
      <Header>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <HeaderTitle>Profile Settings</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>

      <MenuList>
        {menuOptions.map((option) => (
          <MenuItem
            key={option.label}
            onPress={() => handlePress(option.action)}
          >
            <LeftContainer>
              <Ionicons name={option.icon} size={20} color="white" />
              <MenuText>{option.label}</MenuText>
            </LeftContainer>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </MenuItem>
        ))}
      </MenuList>
    </Container>
  );
};

// Styled components
const Container = styled.View`
  flex: 1;
  background-color: rgb(3, 16, 31);
  padding: 20px;
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const HeaderTitle = styled.Text`
  color: white;
  font-size: 18px;
  font-weight: bold;
`;

const MenuList = styled.View`
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 10px 0;
`;

const MenuItem = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom-width: ${StyleSheet.hairlineWidth}px;
  border-bottom-color: rgba(255, 255, 255, 0.1);
`;

const LeftContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 15px;
`;

const MenuText = styled.Text`
  color: white;
  font-size: 16px;
`;

export default ProfileMenu;
