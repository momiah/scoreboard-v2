import React, { useCallback, useState } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import styled from "styled-components/native";
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import Tag from "../Tag";
import { SkeletonPulse, SkeletonBlock } from "../Skeletons/skeletonConfig";
import { ccImageEndpoint, type Club } from "@shared";
import { formatClubLocation } from "../../helpers/formatClubLocation";

interface ClubItemProps {
  club: Club;
  onPress: () => void;
}

const ClubItem: React.FC<ClubItemProps> = ({ club, onPress }) => {
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <CarouselContainer>
      <CarouselItem onPress={onPress}>
        <ImageWrapper>
          {imageLoading && (
            <ImageSkeletonOverlay>
              <SkeletonPulse>
                <SkeletonBlock width="100%" height={200} radius={10} />
              </SkeletonPulse>
            </ImageSkeletonOverlay>
          )}
          <ClubImage
            source={{ uri: club.clubImage || ccImageEndpoint }}
            onLoadEnd={() => setImageLoading(false)}
          >
            <Overlay />
            <ClubDetailsContainer>
              <TagContainer>
                <Tag name="Club" color="#FAB234" bold />
              </TagContainer>

              <ClubName numberOfLines={1}>{club.clubName || ""}</ClubName>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ClubLocation numberOfLines={1}>
                  {formatClubLocation(club.clubLocation)}
                </ClubLocation>
                <Ionicons
                  name="location"
                  size={15}
                  color="#286EFA"
                  style={{ marginLeft: 5 }}
                />
              </View>
            </ClubDetailsContainer>
          </ClubImage>
        </ImageWrapper>
      </CarouselItem>
    </CarouselContainer>
  );
};

interface VerticalClubsCarouselProps {
  clubs: Club[];
}

const VerticalClubsCarousel: React.FC<VerticalClubsCarouselProps> = ({
  clubs,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const navigateToClub = useCallback(
    (clubId: string) => navigation.navigate("Club", { clubId }),
    [navigation],
  );

  return (
    <FlatList
      data={clubs}
      keyExtractor={(item, index) => item.clubId || String(index)}
      renderItem={({ item }) => (
        <ClubItem club={item} onPress={() => navigateToClub(item.clubId)} />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 50 }}
    />
  );
};

const ImageSkeletonOverlay = styled.View({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
});

const CarouselContainer = styled.ScrollView({});

const CarouselItem = styled(TouchableOpacity)({
  marginVertical: 15,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#00152B",
  borderRadius: 10,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 5,
  elevation: 3,
  height: 200,
});

const ImageWrapper = styled(View)({
  width: "100%",
  height: "100%",
  borderRadius: 10,
  overflow: "hidden",
});

const ClubImage = styled.ImageBackground({
  width: "100%",
  height: "100%",
  justifyContent: "flex-end",
  alignItems: "center",
});

const Overlay = styled(View)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.2)",
  borderRadius: 10,
});

const ClubName = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
});

const ClubLocation = styled.Text({
  fontSize: 13,
  color: "white",
  borderRadius: 5,
});

const ClubDetailsContainer = styled.View({
  width: "100%",
  height: "100%",
  borderRadius: 10,
  overflow: "hidden",
  justifyContent: "flex-end",
  padding: 10,
  borderWidth: 1,
  borderColor: "#192336",
});

const TagContainer = styled.View({
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 2,
  flexDirection: "row",
  gap: 5,
});

export default VerticalClubsCarousel;
