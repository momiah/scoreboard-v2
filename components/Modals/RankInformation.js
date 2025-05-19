import React from "react";
import {
  Modal,
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  View,
} from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign } from "@expo/vector-icons";
import { ranks } from "../../rankingMedals/ranking/ranks";

const screenWidth = Dimensions.get("window").width;
const ITEM_WIDTH = screenWidth / 4 - 20;

const groupSize = 4;

export const RankInformation = ({ visible, onClose }) => {
  // Break ranks into groups of 4
  const groupedRanks = [];
  for (let i = 0; i < ranks.length; i += groupSize) {
    groupedRanks.push(ranks.slice(i, i + groupSize));
  }

  return (
    <Modal transparent visible={visible} animationType="slide">
      <ModalContainer>
        <ModalContent>
          <TouchableOpacity
            onPress={onClose}
            style={{
              alignSelf: "flex-end",
              position: "absolute",
              top: 10,
              right: 10,
              zIndex: 10,
            }}
          >
            <AntDesign name="closecircleo" size={30} color="red" />
          </TouchableOpacity>

          <Title>All Ranks</Title>

          <ScrollView
            contentContainerStyle={{
              paddingBottom: 20,
            }}
            showsVerticalScrollIndicator={false}
          >
            {groupedRanks.map((group, index) => (
              <View key={`group-${index}`} style={{ marginBottom: 20 }}>
                <GroupTitle>{`Rank Group ${index + 1}`}</GroupTitle>
                <GroupRow>
                  {group.map((item) => (
                    <RankItem key={item.name}>
                      <RankImage source={item.icon} />
                      <RankName numberOfLines={1}>{item.name}</RankName>
                      <RankXP>{item.xp} XP</RankXP>
                    </RankItem>
                  ))}
                </GroupRow>
              </View>
            ))}
          </ScrollView>
        </ModalContent>
      </ModalContainer>
    </Modal>
  );
};

const ModalContainer = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  padding: 20,
  borderRadius: 10,
  width: screenWidth - 40,
  minHeight: 300,
  maxHeight: "80%",
  justifyContent: "flex-start",
  alignItems: "center",
});

const Title = styled.Text({
  fontSize: 20,
  fontWeight: "bold",
  color: "white",
  marginBottom: 10,
  alignSelf: "flex-start",
});

const GroupTitle = styled.Text({
  fontSize: 14,
  fontWeight: "bold",
  color: "#00A2FF",
  marginBottom: 10,
  alignSelf: "flex-start",
});

const GroupRow = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
});

const RankItem = styled.View({
  width: ITEM_WIDTH,
  alignItems: "center",
  marginBottom: 10,
});

const RankImage = styled.Image({
  width: 50,
  height: 50,
  resizeMode: "contain",
});

const RankName = styled.Text({
  fontSize: 12,
  color: "white",
  marginTop: 4,
  textAlign: "center",
});

const RankXP = styled.Text({
  fontSize: 10,
  color: "#aaa",
  textAlign: "center",
  marginTop: 2,
});
