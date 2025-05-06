import { type } from "@testing-library/react-native/build/user-event/type";
import React from "react";
import { FlatList, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { UserContext } from "../context/UserContext";
import { useContext, useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { set } from "lodash";
import { notificationTypes, notificationSchema } from "../schemas/schema";
import { createdAt } from "expo-updates";
import InviteActionModal from "../components/Modals/InviteActionModal";
import Tag from "../components/Tag";

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
    id: "1",
    type: "invite-league",
    message: "You've been invited to join Laura Trott League!",
    senderId: "PlayerA",
    isRead: false,
    createdAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
    data: {
      id: "Laura-Trott-League-03-05-2025-3SYCN",
    },
  },
  {
    id: "2",
    type: "add-tournament-game",
    message: "PlayerB just added a new game in Birmingham League.",
    senderId: "PlayerB",
    isRead: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
    data: {
      id: "Birmingham-Tourney-03-05-2025-3SYCN",
    },
  },
  {
    id: "3",
    type: "general",
    message: "Welcome to Court Champs! 🎉",
    senderId: "System",
    isRead: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    data: {
      description: "Welcome to Court Champs! 🎉",
    },
  },
  {
    id: "4",
    type: "reminder",
    message: "Don't forget to approve your match result vs PlayerC.",
    senderId: "System",
    isRead: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    data: {
      description: "Don't forget to approve your match result vs PlayerC.",
    },
  },
];
const isActionType = (type) =>
  Object.values(notificationTypes.ACTION.INVITE).includes(type.toLowerCase());

const Notifications = () => {
  const { currentUser, notifications } = useContext(UserContext);
  const [notificationId, setNotificationId] = useState(null);
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [selectedInviteType, setSelectedInviteType] = useState(null);

  console.log("Notifications:", JSON.stringify(notifications, null, 2));

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!currentUser) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [currentUser]);

  if (loading) {
    return (
      <LoadingContainer>
        <ActivityIndicator color="#fff" size="large" />
      </LoadingContainer>
    );
  }

  const NotificationAction = ({ item }) => {
    const isRead = item.isRead;
    const responseText = item.response
      ? item.response.charAt(0).toUpperCase() + item.response.slice(1)
      : null;

    if (isRead) {
      return (
        <Tag
          name={responseText}
          color="#16181B"
          iconColor="green"
          iconSize={15}
          icon={"checkmark-circle-outline"}
          iconPosition={"right"}
          bold
        />
      );
    } else {
      return (
        <NotificationButton
          onPress={() => {
            setSelectedLeagueId(item.data.leagueId); // could be league OR tournament
            setInviteModalVisible(true);
            setSelectedInviteType(item.type);
            setNotificationId(item.id);
          }}
          $type="View"
        >
          <NotificationButtonText>View</NotificationButtonText>
        </NotificationButton>
      );
    }
  };

  const renderNotification = ({ item }) => {
    const showButton = isActionType(item.type);
    const createdAt = item.createdAt?.seconds
      ? new Date(item.createdAt.seconds * 1000)
      : new Date();

    const isInviteNotification =
      item.type === notificationTypes.ACTION.INVITE.LEAGUE ||
      item.type === notificationTypes.ACTION.INVITE.TOURNAMENT;

    const NotificationRow = item.isRead ? ReadNotification : UnreadNotification;

    const isRead = item.isRead;

    return (
      <NotificationRow>
        <NotificationTextContainer $fullWidth={!showButton}>
          <NotificationText
            style={{
              fontWeight: !isRead ? "bold" : "",
              opacity: isRead ? 0.8 : 1,
            }}
          >
            {item.message}
          </NotificationText>
          <NotificationTimestamp>{timeAgo(createdAt)}</NotificationTimestamp>
        </NotificationTextContainer>

        {showButton && isInviteNotification && (
          <NotificationButtonContainer>
            <NotificationAction item={item} />
          </NotificationButtonContainer>
        )}
      </NotificationRow>
    );
  };

  return (
    <HomeContainer>
      <Header>Notifications</Header>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
      />

      <InviteActionModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        inviteId={selectedLeagueId}
        inviteType={selectedInviteType}
        userId={currentUser.userId || ""}
        notificationId={notificationId}
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
  // paddingHorizontal: 20,
});

const Header = styled.Text({
  fontSize: 24,
  fontWeight: "bold",
  marginTop: 20,
  marginBottom: 10,
  color: "white",
  paddingHorizontal: 20,
});

const ReadNotification = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 20,
  paddingHorizontal: 20,
  borderTopWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  width: "100%",
  // opacity: 0.8,
});

const UnreadNotification = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 20,
  paddingHorizontal: 20,

  backgroundColor: "rgba(0, 65, 134, 0.5)",

  width: "100%",
});

const NotificationTextContainer = styled.View`
  padding-right: 10px;
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "70%")};
`;

const NotificationText = styled.Text({
  fontSize: 12,
  color: "white",
});

const NotificationButtonContainer = styled.View({
  flexDirection: "row",
  justifyContent: "flex-end",
});

const NotificationButton = styled.TouchableOpacity.attrs(() => ({
  activeOpacity: 0.8,
}))`
  background-color: rgb(0, 162, 255);
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
