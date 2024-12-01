import React from "react";
import { TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const SubHeader = ({
  title,
  showIcon = false,
  iconName = "add-circle-outline",
  onIconPress,
  actionText,
  navigationRoute,
  checkUserToken
}) => {
  const navigation = useNavigation();

  const navigateTo = (route) => {
    if (route) {
      navigation.navigate(route);
    }
  };

  return (
    <SubHeaderContainer>
      <LeftContainer>
        <TitleText>{title}</TitleText>
        {showIcon && (
          <TouchableOpacity onPress={checkUserToken}>
            <Ionicons name={iconName} size={25} color={"white"} />
          </TouchableOpacity>
        )}
      </LeftContainer>
      {actionText && (
        <ActionText onPress={() => navigateTo(navigationRoute)}>
          {actionText}
        </ActionText>
      )}
    </SubHeaderContainer>
  );
};

// Styled components
const SubHeaderContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 30,
  paddingTop: 35,
  paddingBottom: 20,
});

const LeftContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
});

const TitleText = styled.Text({
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
});

const ActionText = styled.Text({
  color: "white",
  fontSize: 12,
});

export default SubHeader;
