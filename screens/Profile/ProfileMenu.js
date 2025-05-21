// ProfileMenu.js
import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { UserContext } from "../../context/UserContext";
import Popup from "../../components/popup/Popup";
import { PopupContext } from "../../context/PopupContext";
import { BlurView } from "expo-blur";

const ProfileMenu = ({ navigation }) => {
  const { Logout, currentUser, setCurrentUser, isLoggingOut } =
    useContext(UserContext);
  const { showPopup, setShowPopup, popupMessage, setPopupMessage } =
    useContext(PopupContext);

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");

    setCurrentUser(null);

    if (!currentUser) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  };

  const menuOptions = [
    { label: "Edit Profile", icon: "create-outline", action: "EditProfile" },
    { label: "Support", icon: "help-circle-outline", action: "AccountSupport" },
    {
      label: "Feedback",
      icon: "chatbubble-ellipses-outline",
      action: "UserFeedback",
    },
    { label: "Log out", icon: "log-out-outline", action: "logout" },
  ];

  const handlePress = async (action) => {
    if (action === "logout") {
      console.log("Logging out...");
      await Logout();
    } else {
      navigation.navigate(action);
    }
  };

  return (
    <Container>
      <Modal
        transparent
        animationType="fade"
        visible={isLoggingOut || showPopup}
        onRequestClose={() => !isLoggingOut && handleClosePopup()}
      >
        <BlurView style={styles.blurContainer} intensity={50} tint="dark">
          {isLoggingOut ? (
            <LoadingOverlay>
              <ActivityIndicator size="large" color="#00A2FF" />
              <LoadingText>Logging out...</LoadingText>
            </LoadingOverlay>
          ) : (
            <Popup
              visible={showPopup}
              message={popupMessage}
              onClose={handleClosePopup}
              type="success"
            />
          )}
        </BlurView>
      </Modal>
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

// Additional styled components
const LoadingOverlay = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(3, 16, 31, 0.8);
  justify-content: center;
  align-items: center;
  z-index: 10;
`;

const LoadingText = styled.Text`
  color: white;
  margin-top: 12px;
  font-size: 16px;
`;

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

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
