import React from "react";
import styled from "styled-components/native";
import { notificationTypes } from "@shared";
import { useNavigation } from "@react-navigation/native";
import Tag from "../Tag";
import { useContext } from "react";
import { UserContext } from "../../context/UserContext";
import { timeAgo } from "../../helpers/dateTimeUtils";
import { getNotificationDestination } from "../../helpers/notificationDestination";

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
      if (!isRead) {
        readNotification(item.id, currentUser?.userId);
      }
      onPressAction(item);
    } else {
      handleInformationNotification(item);
    }
  };

  const handleInformationNotification = () => {
    if (!isRead) {
      readNotification(item.id, currentUser?.userId);
    }

    const destination = getNotificationDestination(item.type, item.data);
    if (!destination) return;

    navigation.navigate(destination.route, destination.params);
  };

  return (
    <Wrapper onPress={handlePress}>
      <NotificationTextContainer $fullWidth={!responseText}>
        <NotificationText style={NotificationTextStyle}>
          {item.message}
        </NotificationText>
        <NotificationTimestamp>{timeAgo(item.createdAt)}</NotificationTimestamp>
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
