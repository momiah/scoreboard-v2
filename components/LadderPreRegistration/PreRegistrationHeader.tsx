import React from "react";
import { Platform, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

const PreRegistrationHeader: React.FC<{
  title: string;
  onShare?: () => void;
}> = ({ title, onShare }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    // React Native's SafeAreaView only pads on iOS; Android draws edge to edge.
    <Header
      style={Platform.OS === "android" ? { marginTop: insets.top } : undefined}
    >
      <TouchableOpacity
        testID="ladder-pre-registration-back"
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color="white" />
      </TouchableOpacity>
      <Title>{title}</Title>
      {onShare ? (
        <TouchableOpacity
          testID="ladder-pre-registration-share"
          accessibilityLabel="Share this ladder"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={onShare}
        >
          <Ionicons name="share-social-outline" size={22} color="white" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 24 }} />
      )}
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
