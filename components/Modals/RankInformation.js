import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Modal,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  View,
  FlatList,
} from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign } from "@expo/vector-icons";
import { ranks } from "../../rankingMedals/ranking/ranks";
import { CircleSkeleton } from "../../components/Skeletons/UserProfileSkeleton";
import { SKELETON_THEMES } from "../../components/Skeletons/skeletonConfig";

const screenWidth = Dimensions.get("window").width;
const ITEM_WIDTH = screenWidth / 4 - 20;
const ICON_SIZE = screenWidth < 400 ? 50 : 60;
const GROUP_SIZE = 4;

export const RankInformation = ({ visible, onClose }) => {
  const [imageLoadStatus, setImageLoadStatus] = useState({});
  const [shouldLoadImages, setShouldLoadImages] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShouldLoadImages(false);
      setImageLoadStatus({});
    }
  }, [visible]);

  const handleImageLoad = useCallback((rankName) => {
    setImageLoadStatus((prev) => ({ ...prev, [rankName]: true }));
  }, []);

  const handleImageError = useCallback((rankName) => {
    setImageLoadStatus((prev) => ({ ...prev, [rankName]: true }));
  }, []);

  const groupedRanks = useMemo(() => {
    const groups = [];
    for (let i = 0; i < ranks.length; i += GROUP_SIZE) {
      groups.push(ranks.slice(i, i + GROUP_SIZE));
    }
    return groups;
  }, []);

  const renderGroup = ({ item: group, index }) => (
    <GroupContainer>
      <GroupTitle>Rank Group {index + 1}</GroupTitle>
      <GroupRow>
        {group.map((item) => {
          const loading = !imageLoadStatus[item.name];
          return (
            <RankItem key={item.name}>
              <CircleSkeleton
                show={loading}
                size={ICON_SIZE}
                config={SKELETON_THEMES.dark}
              >
                {shouldLoadImages && (
                  <RankImage
                    onLoad={() => handleImageLoad(item.name)}
                    onError={() => handleImageError(item.name)}
                    source={item.icon}
                  />
                )}
              </CircleSkeleton>
              <RankName numberOfLines={1}>{item.name}</RankName>
              <RankXP>{item.xp} XP</RankXP>
            </RankItem>
          );
        })}
      </GroupRow>
    </GroupContainer>
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setShouldLoadImages(true)}
    >
      <ModalContainer>
        <ModalContent>
          <CloseButton onPress={onClose}>
            <AntDesign name="closecircleo" size={30} color="red" />
          </CloseButton>

          <Title>All Ranks</Title>

          <FlatList
            data={groupedRanks}
            renderItem={renderGroup}
            keyExtractor={(_, idx) => `group-${idx}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            initialNumToRender={1}
            maxToRenderPerBatch={1}
          />
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
  height: "80%",
});

const CloseButton = styled(TouchableOpacity)({
  position: "absolute",
  top: 15,
  right: 15,
  zIndex: 10,
});

const Title = styled(Text)({
  fontSize: 24,
  fontWeight: "bold",
  color: "white",
  marginBottom: 20,
});

const GroupContainer = styled(View)({
  marginBottom: 20,
  width: "100%",
});

const GroupTitle = styled(Text)({
  fontSize: 16,
  fontWeight: "600",
  color: "#00A2FF",
  marginBottom: 10,
  alignSelf: "flex-start",
});

const GroupRow = styled(View)({
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
});

const RankItem = styled(View)({
  width: ITEM_WIDTH,
  alignItems: "center",
  marginBottom: 20,
});

const RankImage = styled(Image)({
  width: ICON_SIZE,
  height: ICON_SIZE,
  resizeMode: "contain",
});

const RankName = styled(Text)({
  fontSize: 12,
  color: "white",
  marginTop: 5,
  textAlign: "center",
  fontWeight: "600",
});

const RankXP = styled(Text)({
  fontSize: 10,
  color: "#aaa",
  textAlign: "center",
  marginTop: 2,
});
