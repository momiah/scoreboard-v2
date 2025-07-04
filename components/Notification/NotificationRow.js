import React from "react";
import styled from "styled-components/native";
import { TouchableOpacity, Text } from "react-native";
import { notificationTypes } from "../../schemas/schema";
import { useNavigation } from "@react-navigation/native";
import Tag from "../Tag";
import { useContext } from "react";
import { UserContext } from "../../context/UserContext";

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

const NotificationRow = ({
  item,
  isRead,
  isAction,
  onPressAction,
  currentUser,
  isWelcome,
}) => {
  const navigation = useNavigation();
  const { readNotification } = useContext(UserContext);
  const createdAt = item.createdAt?.seconds
    ? new Date(item.createdAt.seconds * 1000)
    : new Date();

  const responseText = item.response
    ? item.response.charAt(0).toUpperCase() + item.response.slice(1)
    : null;

  const responseIcon =
    item.response === notificationTypes.RESPONSE.ACCEPT
      ? "checkmark-circle-outline"
      : item.response === notificationTypes.RESPONSE.DECLINE
      ? "close-circle-outline"
      : null;

  const responseColor =
    item.response === notificationTypes.RESPONSE.ACCEPT
      ? "green"
      : item.response === notificationTypes.RESPONSE.DECLINE
      ? "red"
      : null;

  const NotificationTextStyle = {
    fontWeight: !isRead ? "bold" : "normal",
    opacity: isRead ? 0.8 : 1,
  };

  const Wrapper = !isRead ? UnreadTouchable : ReadNotification;

  const handlePress = () => {
    if (isAction) {
      onPressAction(item);
    } else if (isWelcome) {
      // This is likely the welcome notification or one meant for modal
      if (!isRead) {
        readNotification(item.id, currentUser?.userId);
      }
      onPressAction(item); // will be routed to modal handler in Notifications
    } else {
      handleInformationNotification(item); // fallback to route navigation
    }
  };

  const handleInformationNotification = () => {
    if (!isRead) {
      readNotification(item.id, currentUser?.userId);
    }

    const infoEntry = Object.values(notificationTypes.INFORMATION).find(
      (entry) => entry.TYPE === item.type
    );

    if (!infoEntry) return;

    const route = infoEntry.ROUTE;

    let routeProp = {};
    if (route === "League") {
      routeProp = { leagueId: item.data?.leagueId, tab: "Scoreboard" };
    } else if (route === "Tournament") {
      routeProp = { tournamentId: item.data?.tournamentId };
    } else if (route === "UserProfile") {
      routeProp = { userId: item.data?.userId };
    }

    navigation.navigate(route, routeProp);
  };

  return (
    <Wrapper onPress={handlePress}>
      <NotificationTextContainer $fullWidth={!responseText}>
        <NotificationText style={NotificationTextStyle}>
          {item.message}
        </NotificationText>
        <NotificationTimestamp>{timeAgo(createdAt)}</NotificationTimestamp>
      </NotificationTextContainer>

      {responseText && (
        <Tag
          name={responseText}
          color="#16181B"
          iconColor={responseColor}
          iconSize={15}
          icon={responseIcon}
          iconPosition="right"
          width="25%"
          bold
        />
      )}
    </Wrapper>
  );
};

export default NotificationRow;

// ---------------- Styled Components ----------------

const ReadNotification = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 20,
  paddingHorizontal: 20,
  borderTopWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  width: "100%",
});

const UnreadTouchable = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 20,
  paddingHorizontal: 20,
  backgroundColor: "rgba(0, 65, 134, 0.5)",
  width: "100%",
});

const NotificationTextContainer = styled.View`
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "70%")};
`;

const NotificationText = styled.Text({
  fontSize: 12,
  color: "white",
});

const NotificationTimestamp = styled.Text({
  fontSize: 10,
  color: "#aaa",
  marginTop: 4,
});
