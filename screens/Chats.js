import React, { useContext, useEffect, useState, memo } from "react";
import { FlatList, ActivityIndicator, View, Dimensions } from "react-native";
import styled from "styled-components/native";
import { doc, getDoc } from "firebase/firestore";
import { UserContext } from "../context/UserContext";
import { PopupContext } from "../context/PopupContext";
import { useNavigation } from "@react-navigation/native";
import { db } from "../services/firebase.config";
import {
  getChatCompetitionId,
  getChatDestination,
  getChatName,
  legacyChatDestination,
} from "../helpers/chatDestination";

const Chats = () => {
  const { currentUser, chatSummaries, readChat } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!currentUser) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [currentUser, navigation]);

  const handleChatPress = async (chat) => {
    const competitionId = getChatCompetitionId(chat);
    let destination = getChatDestination(chat);
    if (!destination && competitionId) {
      try {
        const [league, tournament] = await Promise.all([
          getDoc(doc(db, "leagues", competitionId)),
          getDoc(doc(db, "tournaments", competitionId)),
        ]);
        destination = legacyChatDestination(competitionId, {
          league: league.exists(),
          tournament: tournament.exists(),
        });
      } catch (error) {
        console.error("Error resolving chat destination:", error);
      }
    }
    if (!destination) {
      showBottomToast("This chat is no longer available", "error");
      return;
    }
    readChat(competitionId, currentUser?.userId);
    navigation.navigate(destination.route, destination.params);
  };

  const renderChatRow = ({ item }) => {
    return (
      <ChatRow
        testID={`chats-row-${item.id}`}
        onPress={() => handleChatPress(item)}
        style={{
          backgroundColor: item.isRead
            ? "transparent"
            : "rgba(0, 65, 134, 0.5)",
        }}
      >
        <ChatDetails>
          <LeagueName>{getChatName(item)}</LeagueName>
          <LastMessage numberOfLines={1}>{item.lastMessage}</LastMessage>
        </ChatDetails>
        {!item.isRead && (
          <View
            style={{
              backgroundColor: "#00A2FF",
              borderRadius: 20,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <UnreadBadge>{item.messageCount}</UnreadBadge>
          </View>
        )}
      </ChatRow>
    );
  };

  if (loading) {
    return (
      <LoadingContainer>
        <ActivityIndicator color="#fff" size="large" />
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Header>Chats</Header>
      {chatSummaries.length === 0 && (
        <LoadingContainer>
          <NoChatsText testID="chats-empty">
            Here you can find the chat rooms for your leagues, tournaments and
            ladder matches. Join one to get involved! 🏟️💬
          </NoChatsText>
        </LoadingContainer>
      )}
      <FlatList
        data={[...chatSummaries].sort(
          (a, b) => b.createdAt?.seconds - a.createdAt?.seconds,
        )}
        renderItem={renderChatRow}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </Container>
  );
};

const { width: screenWidth } = Dimensions.get("window");

const Container = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
});

const Header = styled.Text({
  fontSize: 24,
  fontWeight: "bold",
  marginTop: 20,
  marginBottom: 10,
  color: "white",
  paddingHorizontal: 20,
});

const LoadingContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgb(3, 16, 31)",
});

const ChatRow = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 14,
  paddingHorizontal: 20,
  borderBottomWidth: 1,
  borderBottomColor: "#222",
});

const ChatDetails = styled.View({
  flex: 1,
  marginRight: 10,
});

const LeagueName = styled.Text({
  color: "#fff",
  fontSize: screenWidth <= 400 ? 14 : 16,
  fontWeight: "bold",
  marginBottom: 4,
});

const LastMessage = styled.Text({
  color: "#aaa",
  fontSize: 12,
});

const UnreadBadge = styled.Text({
  color: "white",
  fontSize: 12,
  overflow: "hidden",
});

const NoChatsText = styled.Text({
  color: "#aaa",
  fontSize: 16,
  textAlign: "center",
  paddingHorizontal: 20,
});

export default memo(Chats);
