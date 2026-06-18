import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  memo,
} from "react";
import { FlatList, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
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
      item.data.leagueId || item.data.tournamentId || item.data.clubId || item.data.competitionId;

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
    [currentUser, handleNotificationAction],
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
      <HeaderRow>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </BackButton>
        <Header>Notifications</Header>
      </HeaderRow>
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
          notificationData={modalState.data}
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

const HeaderRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  marginTop: 20,
  marginBottom: 10,
  paddingHorizontal: 20,
  gap: 12,
});

const BackButton = styled.TouchableOpacity({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "rgba(255,255,255,0.08)",
  justifyContent: "center",
  alignItems: "center",
});

const Header = styled.Text({
  fontSize: 24,
  fontWeight: "bold",
  color: "white",
});

export default memo(Notifications);
