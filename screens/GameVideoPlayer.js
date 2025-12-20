import React from "react";
import { View, Dimensions, TouchableOpacity } from "react-native";
import { Video } from "expo-av";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

const GameVideoPlayer = ({ route, navigation }) => {
  const { videoUrl } = route.params;

  return (
    <Container>
      <CloseButton onPress={() => navigation.goBack()}>
        <Ionicons name="close-circle" size={32} color="white" />
      </CloseButton>

      <Video
        source={{ uri: videoUrl }}
        style={{
          width: Dimensions.get("window").width,
          height: Dimensions.get("window").height,
        }}
        resizeMode="contain"
        useNativeControls
        shouldPlay
      />
    </Container>
  );
};

const Container = styled.View({
  flex: 1,
  backgroundColor: "black",
  justifyContent: "center",
  alignItems: "center",
});

const CloseButton = styled.TouchableOpacity({
  position: "absolute",
  top: 40,
  right: 20,
  zIndex: 10,
});

export default GameVideoPlayer;
