import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { useNavigation, useRoute } from "@react-navigation/native";

const LeaguSettings = () => {
  const route = useRoute();
  const { leagueId } = route.params;
  const navigation = useNavigation();

  const menuOptions = [
    { label: "Edit League", icon: "create-outline", action: "EditLeague" },
    {
      label: "Pending Invites",
      icon: "person-add-outline",
      action: "PendingInvites",
    },
    {
      label: "Pending Requests",
      icon: "people-outline",
      action: "PendingRequests",
    },
    { label: "Support", icon: "help-circle-outline", action: "LeagueSupport" },
  ];

  const handlePress = (action) => {
    navigation.navigate(action, { leagueId });
  };

  return (
    <Container>
      <Modal transparent animationType="fade" visible={false}>
        <BlurView style={styles.blurContainer} intensity={50} tint="dark" />
      </Modal>

      <Header>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <HeaderTitle>League Settings</HeaderTitle>
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

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

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

export default LeaguSettings;
