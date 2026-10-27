import React from "react";
import { TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

const PreRegistrationHeader: React.FC<{ title: string }> = ({ title }) => {
  const navigation = useNavigation();

  return (
    <Header>
      <TouchableOpacity
        testID="ladder-pre-registration-back"
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color="white" />
      </TouchableOpacity>
      <Title>{title}</Title>
      <View style={{ width: 24 }} />
    </Header>
  );
};

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 12,
});

const Title = styled.Text({
  color: "white",
  fontSize: 17,
  fontWeight: "bold",
});

export default PreRegistrationHeader;
