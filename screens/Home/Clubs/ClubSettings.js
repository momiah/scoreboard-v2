import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { UserContext } from "../../../context/UserContext";

const ClubSettings = () => {
  const route = useRoute();
  const { clubId, club } = route.params;
  const { currentUser } = useContext(UserContext);
  const navigation = useNavigation();

  const isOwner = club?.clubOwner?.userId === currentUser?.userId;

  const menuOptions = [
    { label: "Edit Club", icon: "create-outline", action: "EditClub" },
    {
      label: "Pending Invites",
      icon: "person-add-outline",
      action: "ClubPendingInvites",
    },
    {
      label: "Assign Admin",
      icon: "people-outline",
      action: "ClubAssignAdmin",
    },
    {
      label: "Remove Members",
      icon: "person-remove-outline",
      action: "ClubRemoveMembers",
    },
    {
      label: "Delete Club",
      icon: "trash-outline",
      action: "DeleteClub",
      color: "red",
    },
  ];

  const filteredMenuOptions = isOwner
    ? menuOptions
    : menuOptions.filter(
        (option) =>
          option.action !== "ClubRemoveMembers" &&
          option.action !== "DeleteClub",
      );

  const handlePress = (action) => {
    console.log(`[ClubSettings] Pressed: ${action}`, { clubId, club });
  };

  return (
    <Container>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </BackButton>
        <HeaderTitle>Club Settings</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>

      <MenuList>
        {filteredMenuOptions.map((option) => (
          <MenuItem
            key={option.label}
            onPress={() => handlePress(option.action)}
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

const HeaderTitle = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const BackButton = styled.TouchableOpacity({});

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

export default ClubSettings;
