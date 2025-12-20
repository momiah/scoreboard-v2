import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import moment from "moment";

const LeagueVideos = ({ games, navigation, leagueId }) => {
  const videos = (games || []).filter(
    (g) => g.videoUrl && typeof g.videoUrl === "string"
  );

  if (!videos.length) {
    return (
      <EmptyContainer>
        <Ionicons name="videocam-off-outline" size={40} color="#777" />
        <EmptyText>No videos uploaded yet</EmptyText>
      </EmptyContainer>
    );
  }

  const renderItem = ({ item }) => (
    <VideoCard
      onPress={() =>
        navigation.navigate("GameVideoPlayer", {
          videoUrl: item.videoUrl,
          game: item,
        })
      }
    >
      <Thumbnail>
        <Ionicons name="play-circle" size={48} color="#00A2FF" />
      </Thumbnail>

      <VideoInfo>
        <Title>{item.gamescore || "Game Video"}</Title>
        <Meta>
          {item.reporter} • {moment(item.createdAt?.toDate?.() || item.createdAt).format("DD MMM YYYY")}
        </Meta>
      </VideoInfo>
    </VideoCard>
  );

  return (
    <FlatList
      data={videos}
      keyExtractor={(item, index) => item.gameId || index.toString()}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 15 }}
    />
  );
};

const { width } = Dimensions.get("window");

const VideoCard = styled.TouchableOpacity({
  flexDirection: "row",
  backgroundColor: "rgba(255,255,255,0.05)",
  borderRadius: 12,
  marginBottom: 12,
  overflow: "hidden",
});

const Thumbnail = styled.View({
  width: 100,
  height: 80,
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "center",
  alignItems: "center",
});

const VideoInfo = styled.View({
  flex: 1,
  padding: 10,
  justifyContent: "center",
});

const Title = styled.Text({
  color: "white",
  fontSize: 14,
  fontWeight: "bold",
});

const Meta = styled.Text({
  color: "#aaa",
  fontSize: 12,
  marginTop: 4,
});

const EmptyContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 50,
});

const EmptyText = styled.Text({
  color: "#888",
  marginTop: 10,
  fontSize: 14,
});

export default LeagueVideos;
