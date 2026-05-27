import React from "react";
import { TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";

interface SubHeaderProps {
  title: string;
  showIcon?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  onIconPress?: () => void;
  actionText?: string;
  navigationRoute?: string;
  paddingTop?: number;
  paddingBottom?: number;
}

const SubHeader = ({
  title,
  showIcon = false,
  iconName = "add-circle-outline",
  onIconPress,
  actionText,
  navigationRoute,
  paddingTop = 35,
  paddingBottom = 20,
}: SubHeaderProps) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const navigateTo = (route: string | undefined) => {
    navigation.navigate(route as never);
  };

  return (
    <SubHeaderContainer style={{ paddingTop, paddingBottom }}>
      <LeftContainer>
        <TitleText>{title}</TitleText>
        {showIcon && (
          <TouchableOpacity onPress={onIconPress}>
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
