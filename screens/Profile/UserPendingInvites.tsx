import React, { useContext, useState, useCallback, useMemo } from "react";
import { FlatList, Platform } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { UserContext } from "../../context/UserContext";
import { getModalTypeForNotification } from "../../helpers/handleNotificationAction";
import NotificationRow from "../../components/Notification/NotificationRow";
import InviteActionModal from "../../components/Modals/InviteActionModal";
import { Notification } from "../../shared";

const UserPendingInvites = () => {
  const { currentUser, notifications } = useContext(UserContext);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  // ── Modal state mirrors the Notifications screen ──
  const [modalState, setModalState] = useState<{
    notificationId: string | null;
    notificationType: string | null;
    selectedCompetitionId: string | null;
    isRead: boolean;
  }>({
    notificationId: null,
    notificationType: null,
    selectedCompetitionId: null,
    isRead: false,
  });
  const [inviteVisible, setInviteVisible] = useState(false);

  // ── Only invite notifications, across all competitions ──
  const inviteNotifications = useMemo(() => {
    return (notifications || []).filter(
      (item: Notification) =>
        getModalTypeForNotification(item.type) === "invite",
    );
  }, [notifications]);

  const handleNotificationAction = useCallback((item: Notification) => {
    const rawCompetitionId =
      item.data?.leagueId ??
      item.data?.tournamentId ??
      item.data?.competitionId;

    const notificationCompetitionId =
      typeof rawCompetitionId === "string" ||
      typeof rawCompetitionId === "number"
        ? String(rawCompetitionId)
        : null;

    setModalState({
      notificationId: item.id ?? null,
      notificationType: item.type ?? null,
      selectedCompetitionId: notificationCompetitionId,
      isRead: !!item.isRead,
    });
    setInviteVisible(true);
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
        <Header>Invitations</Header>
      </HeaderRow>

      {inviteNotifications.length === 0 ? (
        <EmptyText>
          You have no pending invitations. When an owner invites you to a league
          or tournament, it'll show up here 📩
        </EmptyText>
      ) : (
        <FlatList
          data={inviteNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => (item.id ?? Math.random()).toString()}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews
        />
      )}

      {inviteVisible && (
        <InviteActionModal
          visible={inviteVisible}
          onClose={() => setInviteVisible(false)}
          inviteId={modalState.selectedCompetitionId || ""}
          inviteType={
            modalState.notificationType as "invite-league" | "invite-tournament"
          }
          notificationId={modalState.notificationId || ""}
          isRead={modalState.isRead}
        />
      )}
    </Container>
  );
};

export default UserPendingInvites;

// ─── Styled Components ────────────────────────────────────────────────────────

const Container = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  width: "100%",
  paddingTop: Platform.OS === "android" ? 40 : 0,
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
