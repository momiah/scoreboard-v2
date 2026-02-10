import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  memo,
} from "react";
import { FlatList, ActivityIndicator, Platform } from "react-native";
import styled from "styled-components/native";
import { UserContext } from "../context/UserContext";
import { useNavigation } from "@react-navigation/native";
import InviteActionModal from "../components/Modals/InviteActionModal";
import JoinRequestModal from "../components/Modals/JoinRequestModal";
import GameApprovalModal from "../components/Modals/GameApprovalModal";
import NotificationRow from "../components/Notification/NotificationRow";
import WelcomeModal from "../components/Modals/WelcomeModal";
import {
  isActionType,
  isWelcomeType,
  getModalTypeForNotification,
  MODAL_TYPES,
} from "../helpers/handleNotificationAction";

const Notifications = () => {
  const { currentUser, notifications } = useContext(UserContext);
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);

  // Common modal state
  const [modalState, setModalState] = useState({
    notificationId: null,
    notificationType: null,
    senderId: null,
    selectedCompetitionId: null,
    gameId: null,
    isRead: false,
    data: null,
  });

  // Modal visibility states
  const [modals, setModals] = useState({
    invite: false,
    joinRequest: false,
    gameApproval: false,
    welcome: false,
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

  const closeAllModals = useCallback(() => {
    setModals({
      invite: false,
      joinRequest: false,
      gameApproval: false,
      welcome: false,
    });
  }, []);

  const handleNotificationAction = useCallback((item) => {
    const competitionId =
      item.data.leagueId || item.data.tournamentId || item.data.competitionId;

    const commonState = {
      notificationId: item.id,
      notificationType: item.type,
      selectedCompetitionId: competitionId,
      senderId: item.senderId,
      isRead: item.isRead,
      gameId: item.data.gameId || null,
      data: item.data ?? null,
      response: item.response || null,
    };

    setModalState(commonState);

    const modalType = getModalTypeForNotification(item.type);
    setModals((prev) => ({ ...prev, [modalType]: true }));
  }, []);

  const renderNotification = useCallback(
    ({ item }) => (
      <NotificationRow
        item={item}
        isRead={item.isRead}
        isAction={isActionType(item.type)}
        isWelcome={isWelcomeType(item.type)}
        onPressAction={handleNotificationAction}
        currentUser={currentUser}
      />
    ),
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

      {modals.welcome && (
        <WelcomeModal
          visible={modals.welcome}
          onClose={closeAllModals}
          header={modalState.data?.header}
          body={modalState.data?.body}
          data={modalState.data}
        />
      )}

      {modals.invite && (
        <InviteActionModal
          visible={modals.invite}
          onClose={closeAllModals}
          inviteId={modalState.selectedCompetitionId || ""}
          inviteType={modalState.notificationType}
          notificationId={modalState.notificationId}
          isRead={modalState.isRead}
        />
      )}

      {modals.joinRequest && (
        <JoinRequestModal
          visible={modals.joinRequest}
          onClose={closeAllModals}
          requestId={modalState.selectedCompetitionId || ""}
          requestType={modalState.notificationType}
          notificationId={modalState.notificationId}
          senderId={modalState.senderId}
          isRead={modalState.isRead}
        />
      )}

      {modals.gameApproval && (
        <GameApprovalModal
          visible={modals.gameApproval}
          onClose={closeAllModals}
          notificationId={modalState.notificationId}
          notificationType={modalState.notificationType}
          senderId={modalState.senderId}
          gameId={modalState.gameId || ""}
          competitionId={modalState.selectedCompetitionId || ""}
          isRead={modalState.isRead}
          response={modalState.response}
        />
      )}
    </HomeContainer>
  );
};

const platformAdjustedPaddingTop = Platform.OS === "ios" ? undefined : 30; // Adjust font size based on screen width

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
  paddingTop: platformAdjustedPaddingTop,
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
