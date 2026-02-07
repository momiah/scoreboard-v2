import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
  useMemo,
} from "react";
import {
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  View,
  Text,
} from "react-native";
import { PlatformBlurView as BlurView } from "../../components/PlatformBlurView";
import Ionicons from "@expo/vector-icons/Ionicons";
import styled from "styled-components/native";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase.config";
import { UserContext } from "../../context/UserContext";
import { LeagueContext } from "../../context/LeagueContext";
import { COMPETITION_TYPES } from "../../schemas/schema";
import moment from "moment";

const ChatRoom = ({
  competitionId,
  userRole,
  competitionParticipants,
  competitionName,
  endDate,
  competitionType,
}) => {
  const { currentUser } = useContext(UserContext);
  const { sendChatMessage } = useContext(LeagueContext);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Scroll to end function with delay to ensure rendering is complete
  const scrollToEnd = useCallback((animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 100);
  }, []);

  useEffect(() => {
    if (!competitionId) return;

    const collectionRef =
      competitionType === COMPETITION_TYPES.TOURNAMENT
        ? "tournaments"
        : "leagues";

    const q = query(
      collection(db, collectionRef, competitionId, "chat"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text,
          createdAt: data.createdAt.toDate(),
          user: data.user,
        };
      });

      console.log("Fetched messages:", msgs);
      setMessages(msgs);

      // Scroll to end when messages are loaded or updated
      if (msgs.length > 0) {
        scrollToEnd(!isInitialLoad);
        if (isInitialLoad) {
          setIsInitialLoad(false);
        }
      }
    });

    return () => unsubscribe();
  }, [competitionId, scrollToEnd, isInitialLoad]);

  // at top of component
  const leagueHasEnded = moment(endDate, "DD-MM-YYYY").isBefore(
    moment(),
    "day"
  );

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const newMessage = {
      text: inputText.trim(),
      createdAt: Timestamp.now(),
      user: {
        _id: currentUser?.userId,
        name: currentUser?.username,
        avatar: currentUser?.profileImage || "",
      },
    };

    await sendChatMessage({
      message: newMessage,
      competitionId,
      competitionType,
    });
    setInputText("");
    Keyboard.dismiss();

    // Scroll to end after sending message
    scrollToEnd(true);

    const recipients = competitionParticipants.filter(
      (u) => u.userId !== currentUser?.userId
    );

    for (const recipient of recipients) {
      const chatRef = doc(
        db,
        "users",
        recipient.userId,
        "chats",
        competitionId
      );
      const existing = await getDoc(chatRef);

      if (existing.exists()) {
        await setDoc(
          chatRef,
          {
            isRead: false,
            messageCount: (existing.data().messageCount || 0) + 1,
            lastMessage: `${currentUser?.username}: ${newMessage.text}`,
            createdAt: new Date(),
            competitionName,
          },
          { merge: true }
        );
      } else {
        await setDoc(chatRef, {
          type: "chat",
          isRead: false,
          messageCount: 1,
          competitionId,
          lastMessage: `${currentUser?.username}: ${newMessage.text}`,
          createdAt: new Date(),
          competitionName,
        });
      }
    }
  };

  const formatDate = (date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    return isToday
      ? "Today"
      : date.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  };

  const restrictedRoles = [
    "hide",
    "user",
    "invitationPending",
    "requestPending",
  ];

  if (restrictedRoles.includes(userRole)) {
    return (
      <BlurView
        intensity={10}
        tint="dark"
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text
          style={{
            color: "#aaa",
            fontSize: 14,
            textAlign: "center",
            padding: 20,
            fontStyle: "italic",
          }}
        >
          Only participants of the league can view this chat 📝
        </Text>
      </BlurView>
    );
  }

  const renderItem = ({ item, index }) => {
    const isCurrentUser = item.user._id === currentUser?.userId;
    const showAvatar =
      index === 0 || messages[index - 1]?.user._id !== item.user._id;

    const showDate =
      index === 0 ||
      new Date(item.createdAt).toDateString() !==
        new Date(messages[index - 1].createdAt).toDateString();

    return (
      <View>
        {showDate && (
          <DateContainer>
            <DateText>{formatDate(item.createdAt)}</DateText>
          </DateContainer>
        )}
        <MessageContainer isCurrentUser={isCurrentUser}>
          {/* Avatar and username container */}
          {!isCurrentUser && showAvatar && (
            <UserInfoContainer>
              <AvatarImage source={{ uri: item.user.avatar }} />
              <UserName>{item.user.name}</UserName>
            </UserInfoContainer>
          )}

          {/* Current user avatar (no username) */}
          {isCurrentUser && showAvatar && (
            <AvatarImage source={{ uri: item.user.avatar }} />
          )}

          <BubbleContainer isCurrentUser={isCurrentUser}>
            <MessageText>{item.text}</MessageText>
            <TimeText>
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </TimeText>
          </BubbleContainer>
        </MessageContainer>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 50 : 0}
    >
      <FlatList
        ref={flatListRef}
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onScrollToIndexFailed={() => {
          scrollToEnd(false);
        }}
      />
      <InputBar>
        <MessageInput
          value={inputText}
          onChangeText={leagueHasEnded ? null : setInputText}
          placeholder={
            leagueHasEnded
              ? "Chat room closed as the league has ended"
              : "Type a message..."
          }
          placeholderTextColor="#aaa"
        />
        <SendButton
          onPress={handleSend}
          disabled={!inputText.trim() || leagueHasEnded}
        >
          <Ionicons name="send" size={24} color="#00A2FF" />
        </SendButton>
      </InputBar>
    </KeyboardAvoidingView>
  );
};

const MessageContainer = styled.View(({ isCurrentUser }) => ({
  flexDirection: "column",
  alignItems: isCurrentUser ? "flex-end" : "flex-start",
  marginBottom: 10,
  marginHorizontal: 10,
}));

const AvatarImage = styled.Image({
  width: 28,
  height: 28,
  borderRadius: 14,
  marginBottom: 5,
  backgroundColor: " rgb(5, 23, 45)",
});

const BubbleContainer = styled.View(({ isCurrentUser }) => ({
  backgroundColor: isCurrentUser ? "#00A2FF" : "#0D213A",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 12,
  maxWidth: "75%",
  alignSelf: isCurrentUser ? "flex-end" : "flex-start",
}));

const MessageText = styled.Text({
  color: "#fff",
  fontSize: 14,
});

const TimeText = styled.Text({
  color: "white",
  fontSize: 10,
  marginTop: 4,
  textAlign: "right",
});

const DateContainer = styled.View({
  alignItems: "center",
  marginVertical: 10,
});

const DateText = styled.Text({
  color: "#aaa",
  fontSize: 12,
});

const InputBar = styled.View({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 10,
  paddingVertical: 8,
  backgroundColor: "#00152B",
});

const UserName = styled.Text({
  color: "#fff",
  fontSize: 14,
  fontWeight: "bold",
  marginBottom: 4,
  marginLeft: 10,
});

const UserInfoContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
});

const MessageInput = styled.TextInput({
  flex: 1,
  color: "#fff",
  fontSize: 14,
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 8,
  marginRight: 10,
});

const SendButton = styled.TouchableOpacity(({ disabled }) => ({
  opacity: disabled ? 0.5 : 1,
}));

export default ChatRoom;
