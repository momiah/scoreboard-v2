import React, { useContext, useState, useCallback, useMemo } from "react";
import { FlatList } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { UserContext } from "../../../context/UserContext";
import { notificationTypes } from "@shared";
import { getModalTypeForNotification } from "../../../helpers/handleNotificationAction";
import NotificationRow from "../../../components/Notification/NotificationRow";
import JoinRequestModal from "../../../components/Modals/JoinRequestModal";
import { Notification } from "@/shared";

const ClubPendingRequests = () => {
  const { currentUser, notifications } = useContext(UserContext);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const route = useRoute();
  const { clubId } = route.params as { clubId: string };

  const [modalState, setModalState] = useState<{
    notificationId: string | null;
    notificationType: string | null;
    senderId: string | null;
    selectedCompetitionId: string | null;
    isRead: boolean;
    notificationData: Record<string, unknown> | null;
  }>({
    notificationId: null,
    notificationType: null,
    senderId: null,
    selectedCompetitionId: null,
    isRead: false,
    notificationData: null,
  });
  const [joinRequestVisible, setJoinRequestVisible] = useState(false);

  const requestNotifications = useMemo(() => {
    return (notifications || []).filter((item: Notification) => {
      if (item.type !== notificationTypes.ACTION.JOIN_REQUEST.CLUB) return false;
      return item.data?.clubId === clubId;
    });
  }, [notifications, clubId]);

  const handleNotificationAction = useCallback((item: Notification) => {
    setModalState({
      notificationId: item.id ?? null,
      notificationType: item.type ?? null,
      senderId: item.senderId ?? null,
      selectedCompetitionId:
        typeof item.data?.clubId === "string" ? item.data.clubId : null,
      isRead: !!item.isRead,
      notificationData: item.data ?? null,
    });
    setJoinRequestVisible(true);
  }, []);

  const renderNotification = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationRow
        item={item}
        isRead={item.isRead}
        isAction
        isWelcome={false}
        onPressAction={handleNotificationAction}
        currentUser={currentUser}
      />
    ),
    [currentUser, handleNotificationAction],
  );

  return (
    <Container>
      <HeaderRow>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </BackButton>
        <Header>Pending Requests</Header>
      </HeaderRow>

      {requestNotifications.length === 0 ? (
        <EmptyText>
          No pending requests yet. When players request to join your club,
          they&apos;ll appear here for you to review.
        </EmptyText>
      ) : (
        <FlatList
          data={requestNotifications}
          renderItem={renderNotification}
          keyExtractor={(item, index) => String(item.id ?? index)}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews
        />
      )}

      {joinRequestVisible && (
        <JoinRequestModal
          visible={joinRequestVisible}
          onClose={() => setJoinRequestVisible(false)}
          requestId={modalState.selectedCompetitionId || ""}
          requestType={modalState.notificationType ?? ""}
          notificationId={modalState.notificationId ?? ""}
          senderId={modalState.senderId ?? ""}
          isRead={modalState.isRead}
          notificationData={modalState.notificationData}
        />
      )}
    </Container>
  );
};

export default ClubPendingRequests;

const Container = styled.View({
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

const EmptyText = styled.Text({
  color: "#888",
  fontSize: 16,
  textAlign: "center",
  marginTop: 40,
  paddingHorizontal: 20,
});
