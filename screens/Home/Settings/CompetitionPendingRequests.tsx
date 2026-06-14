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
import { getCompetitionTypeAndId } from "@/helpers/getCompetitionConfig";
import { getModalTypeForNotification } from "../../../helpers/handleNotificationAction";
import NotificationRow from "../../../components/Notification/NotificationRow";
import JoinRequestModal from "../../../components/Modals/JoinRequestModal";
import { Notification } from "@/shared";

const CompetitionPendingRequests = () => {
  const { currentUser, notifications } = useContext(UserContext);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const route = useRoute();
  const { leagueId, tournamentId, collectionName } = route.params as {
    leagueId?: string;
    tournamentId?: string;
    collectionName: string;
  };

  const { competitionId, competitionType } = getCompetitionTypeAndId({
    collectionName,
    leagueId: leagueId ?? "",
    tournamentId: tournamentId ?? "",
  });

  // ── Modal state mirrors the Notifications screen ──
  const [modalState, setModalState] = useState<{
    notificationId: string | null;
    notificationType: string | null;
    senderId: string | null;
    selectedCompetitionId: string | null;
    isRead: boolean;
  }>({
    notificationId: null,
    notificationType: null,
    senderId: null,
    selectedCompetitionId: null,
    isRead: false,
  });
  const [joinRequestVisible, setJoinRequestVisible] = useState(false);

  // ── Only join-request notifications scoped to this competition ──
  const requestNotifications = useMemo(() => {
    return (notifications || []).filter((item: Notification) => {
      if (getModalTypeForNotification(item.type) !== "joinRequest")
        return false;
      const notificationCompetitionId =
        item.data?.leagueId ||
        item.data?.tournamentId ||
        item.data?.competitionId;
      return notificationCompetitionId === competitionId;
    });
  }, [notifications, competitionId]);

  const handleNotificationAction = useCallback((item: Notification) => {
    const rawCompetitionId =
      item.data?.leagueId ??
      item.data?.tournamentId ??
      item.data?.competitionId ??
      null;

    const notificationCompetitionId =
      typeof rawCompetitionId === "string" ? rawCompetitionId : null;

    setModalState({
      notificationId: item.id ?? null,
      notificationType: item.type ?? null,
      senderId: item.senderId ?? null,
      selectedCompetitionId: notificationCompetitionId,
      isRead: !!item.isRead,
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
          No pending requests yet. When players request to join your{" "}
          {competitionType}, they'll appear here for you to review
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
        />
      )}
    </Container>
  );
};

export default CompetitionPendingRequests;

// ─── Styled Components ────────────────────────────────────────────────────────

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
