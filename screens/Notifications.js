import { type } from "@testing-library/react-native/build/user-event/type";
import React from "react";
import { FlatList, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { UserContext } from "../context/UserContext";
import { useContext, useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { set } from "lodash";

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count > 0) {
      return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
};

const mockNotifications = [
  {
    id: 1,
    type: "request",
    message: "PlayerA has requested to join London League!",
    receivedAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
    buttons: [
      { label: "View", onPress: () => console.log("Accepted PlayerA") },
      { label: "Reject", onPress: () => console.log("Rejected PlayerA") },
    ],
  },
  {
    id: 2,
    type: "invite",
    message: "Manchester League has invited you to join!",
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    buttons: [
      { label: "View", onPress: () => console.log("Accepted League Invite") },
      { label: "Reject", onPress: () => console.log("Rejected League Invite") },
    ],
  },
  {
    id: 3,
    type: "game",
    message: "New game added in Birmingham League!",
    receivedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000), // 18 days ago
    buttons: [
      { label: "View", onPress: () => console.log("Accepted Game") },
      { label: "Reject", onPress: () => console.log("Rejected Game") },
    ],
  },
  {
    id: 4,
    type: "information",
    message: "PlayerB has rejected your score for London League!",
    receivedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 18 days ago
    buttons: null,
  },
  {
    id: 5,
    type: "information",
    message: "PlayerA has rejected your invitation to join London League!",
    receivedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 18 days ago
    buttons: null,
  },
  {
    id: 6,
    type: "information",
    message: "PlayerC has rejected your request to join Birmingham League!",
    receivedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 18 days ago
    buttons: null,
  },
  {
    id: 7,
    type: "information",
    message: "PlayerD has accepted your request to join Manchester League!",
    receivedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 18 days ago
    buttons: null,
  },
  {
    id: 8,
    type: "information",
    message:
      "Your partner, PlayerE has just added a game in Manchester League!",
    receivedAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000), // 18 days ago
    buttons: null,
  },
];
const Notifications = () => {
  const { currentUser } = useContext(UserContext);
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate a slight delay while Firebase resolves auth state
    const timeout = setTimeout(() => {
      if (!currentUser) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        setLoading(false);
      }
    }, 200); // Adjust if needed

    return () => clearTimeout(timeout);
  }, [currentUser]);

  if (loading) {
    return (
      <LoadingContainer>
        <ActivityIndicator color="#fff" size="large" />
      </LoadingContainer>
    );
  }
  const renderNotification = ({ item }) => {
    const hasButtons = item.buttons && item.buttons.length > 0;

    return (
      <NotificationRow>
        <NotificationTextContainer $fullWidth={!hasButtons}>
          <NotificationText>{item.message}</NotificationText>
          <NotificationTimestamp>
            {timeAgo(item.receivedAt)}
          </NotificationTimestamp>
        </NotificationTextContainer>

        {hasButtons && (
          <NotificationButtonContainer>
            {item.buttons.map((btn, index) => (
              <NotificationButton
                key={index}
                onPress={btn.onPress}
                $type={btn.label}
              >
                <NotificationButtonText>{btn.label}</NotificationButtonText>
              </NotificationButton>
            ))}
          </NotificationButtonContainer>
        )}
      </NotificationRow>
    );
  };

  return (
    <HomeContainer>
      <Header>Notifications</Header>
      <FlatList
        data={mockNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
      />
    </HomeContainer>
  );
};

// ---------- Styled Components ----------

const LoadingContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgb(3, 16, 31)",
});

const HomeContainer = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  width: "100%",
  paddingHorizontal: 20,
});

const Header = styled.Text({
  fontSize: 24,
  fontWeight: "bold",
  marginTop: 20,
  marginBottom: 10,
  color: "white",
});

const NotificationRow = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 20,
  paddingHorizontal: 10,
  borderTopWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  width: "100%",
});

const NotificationTextContainer = styled.View`
  padding-right: 10px;
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "55%")};
`;

const NotificationText = styled.Text({
  fontSize: 12,
  color: "white",
});

const NotificationButtonContainer = styled.View({
  flexDirection: "row",
  justifyContent: "flex-end",
  gap: 10,
});

const NotificationButton = styled.TouchableOpacity.attrs(() => ({
  activeOpacity: 0.8,
}))`
  background-color: ${({ $type }) =>
    $type === "Reject" ? "red" : "rgb(0, 162, 255)"};
  padding: 4px 10px;
  border-radius: 6px;
  margin-left: 6px;
  margin-bottom: 4px;
`;

const NotificationButtonText = styled.Text({
  color: "white",
  fontSize: 11,
  fontWeight: "500",
});

const NotificationTimestamp = styled.Text({
  fontSize: 10,
  color: "#aaa",
  marginTop: 4,
});

export default Notifications;
