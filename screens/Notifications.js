import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  memo,
} from "react";
import { FlatList, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { UserContext } from "../context/UserContext";
import { useNavigation } from "@react-navigation/native";
import { notificationTypes } from "../schemas/schema";
import InviteActionModal from "../components/Modals/InviteActionModal";
import JoinRequestModal from "../components/Modals/JoinRequestModal";
import GameApprovalModal from "../components/Modals/GameApprovalModal";
import NotificationRow from "../components/Notification/NotificationRow";

// Extract notification type constants
const ACTION_TYPES = {
  INVITE: Object.values(notificationTypes.ACTION.INVITE),
  JOIN_REQUEST: Object.values(notificationTypes.ACTION.JOIN_REQUEST),
};

// Flatten and lowercase all action types for easier checking
const allActionTypes = Object.values(notificationTypes.ACTION)
  .flatMap(Object.values)
  .map((t) => t.toLowerCase());

// Helper function to check if a notification is an action type
const isActionType = (type) => allActionTypes.includes(type.toLowerCase());

const Notifications = () => {
  const { currentUser, notifications } = useContext(UserContext);
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);

  // Common modal state
  const [modalState, setModalState] = useState({
    notificationId: null,
    notificationType: null,
    senderId: null,
    selectedLeagueId: null,
    gameId: null,
    playersToUpdate: null,
    usersToUpdate: null,
    isRead: false,
  });

  // Modal visibility states
  const [modals, setModals] = useState({
    invite: false,
    joinRequest: false,
    gameApproval: false,
  });

  // Redirect if not logged in
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

  // Modal toggle handlers
  const closeAllModals = useCallback(() => {
    setModals({
      invite: false,
      joinRequest: false,
      gameApproval: false,
    });
  }, []);

  // Handler for notification actions
  const handleNotificationAction = useCallback((item) => {
    // Set common state regardless of modal type
    const commonState = {
      notificationId: item.id,
      notificationType: item.type,
      selectedLeagueId: item.data.leagueId,
      senderId: item.senderId,
      isRead: item.isRead,
    };

    // Clear previous state and set new state
    setModalState({
      ...commonState,
      gameId: item.data.gameId || null,
      playersToUpdate: item.data.playersToUpdate || null,
      usersToUpdate: item.data.usersToUpdate || null,
    });

    // Open the appropriate modal
    if (ACTION_TYPES.INVITE.includes(item.type)) {
      setModals((prev) => ({ ...prev, invite: true }));
    } else if (ACTION_TYPES.JOIN_REQUEST.includes(item.type)) {
      setModals((prev) => ({ ...prev, joinRequest: true }));
    } else {
      setModals((prev) => ({ ...prev, gameApproval: true }));
    }
  }, []);

  // Memoized render function to prevent unnecessary rerenders
  const renderNotification = useCallback(
    ({ item }) => {
      return (
        <NotificationRow
          item={item}
          isRead={item.isRead}
          isAction={isActionType(item.type)}
          onPressAction={handleNotificationAction}
          currentUser={currentUser}
        />
      );
    },
    [currentUser, handleNotificationAction]
  );

  if (loading) {
    return (
      <LoadingContainer>
        <ActivityIndicator color="#fff" size="large" />
      </LoadingContainer>
    );
  }

  return (
    <HomeContainer>
      <Header>Notifications</Header>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id.toString()}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />

      <InviteActionModal
        visible={modals.invite}
        onClose={closeAllModals}
        inviteId={modalState.selectedLeagueId || ""}
        inviteType={modalState.notificationType}
        notificationId={modalState.notificationId}
        isRead={modalState.isRead}
      />

      <JoinRequestModal
        visible={modals.joinRequest}
        onClose={closeAllModals}
        requestId={modalState.selectedLeagueId || ""}
        requestType={modalState.notificationType}
        notificationId={modalState.notificationId}
        senderId={modalState.senderId}
        isRead={modalState.isRead}
      />

      <GameApprovalModal
        visible={modals.gameApproval}
        onClose={closeAllModals}
        notificationId={modalState.notificationId}
        notificationType={modalState.notificationType}
        senderId={modalState.senderId}
        gameId={modalState.gameId || ""}
        leagueId={modalState.selectedLeagueId || ""}
        playersToUpdate={modalState.playersToUpdate || ""}
        usersToUpdate={modalState.usersToUpdate || ""}
        isRead={modalState.isRead}
      />
    </HomeContainer>
  );
};

// Styled Components
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
});

const Header = styled.Text({
  fontSize: 24,
  fontWeight: "bold",
  marginTop: 20,
  marginBottom: 10,
  color: "white",
  paddingHorizontal: 20,
});

export default memo(Notifications);
