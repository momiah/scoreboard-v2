import React, { useContext, useState, useEffect, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Share,
  ScrollView,
  FlatList,
  Modal,
} from "react-native";
import styled from "styled-components/native";
import { SafeAreaView } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import Tag from "../components/Tag";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../services/firebase.config";
import { collection, query, getDocs } from "firebase/firestore";
import { UserContext } from "../context/UserContext";
import { notificationSchema, notificationTypes } from "../schemas/schema";
import moment from "moment";
import { LeagueContext } from "../context/LeagueContext";
import { PopupContext } from "../context/PopupContext";
import Popup from "../components/popup/Popup";
import {
  League,
  Tournament,
  NormalizedCompetition,
  CompetitionType,
} from "@/types/competition";
import { COMPETITION_TYPES, COLLECTION_NAMES } from "@/schemas/schema";
import { UserProfile } from "@/types/player";
import { normalizeCompetitionData } from "@/helpers/normalizeCompetitionData";
import RecentPlayersModal from "../components/Modals/RecentPlayersModal";
import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { formatDisplayName } from "@/helpers/formatDisplayName";
import { debounce } from "lodash";
import QRCodeLib from "qrcode";
import Svg, { Rect } from "react-native-svg";

type RouteParams = {
  InvitePlayer: {
    competitionDetails: League | Tournament;
    competitionType: CompetitionType;
  };
};

const InvitePlayer = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<RouteParams, "InvitePlayer">>();
  const { competitionDetails, competitionType } = route.params;

  const [searchUser, setSearchUser] = useState("");
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [inviteUsers, setInviteUsers] = useState<UserProfile[]>([]);
  const [validationError, setValidationError] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "recent">("search");
  const [recentPlayersVisible, setRecentPlayersVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [qrVisible, setQrVisible] = useState(false);

  const { sendNotification } = useContext(UserContext);
  const { updatePendingInvites } = useContext(LeagueContext);
  const {
    handleShowPopup,
    setPopupMessage,
    popupMessage,
    setShowPopup,
    showPopup,
  } = useContext(PopupContext);

  useEffect(() => {
    AsyncStorage.getItem("userId").then((id) => {
      if (id) setCurrentUserId(id);
    });
  }, []);

  const competition = normalizeCompetitionData({
    rawData: competitionDetails,
    competitionType,
  }) as NormalizedCompetition;

  const collectionName =
    competitionType === COMPETITION_TYPES.LEAGUE
      ? COLLECTION_NAMES.leagues
      : COLLECTION_NAMES.tournaments;

  const hasUserConflict = (userId: string) => {
    const inLeague = competition.participants?.some((u) => u.userId === userId);
    const inPendingInvites = competition.pendingInvites?.some(
      (u) => u.userId === userId,
    );
    const inPendingRequests = competition.pendingRequests?.some(
      (u) => u.userId === userId,
    );
    return inLeague || inPendingInvites || inPendingRequests;
  };

  const fixturesGenerated =
    competitionType === COMPETITION_TYPES.TOURNAMENT &&
    (competitionDetails as Tournament).fixturesGenerated;

  const competitionEnded = competition.endDate
    ? moment(competition.endDate, "DD-MM-YYYY").isBefore(moment())
    : false;

  const conflictedUsers = inviteUsers.filter((user) =>
    hasUserConflict(user.userId),
  );
  const hasConflicts = conflictedUsers.length > 0;

  const getBlockingError = (): string => {
    if (competitionEnded) {
      const label =
        competitionType === COMPETITION_TYPES.LEAGUE ? "league" : "tournament";
      return `Cannot invite players as the ${label} has ended.`;
    }
    if (fixturesGenerated) {
      return "Cannot invite players as fixtures have been generated for this tournament.";
    }
    const totalCount =
      competition.participants.length +
      inviteUsers.length +
      competition.pendingInvites.length;
    if (totalCount > competition.maxPlayers) {
      const pendingCount = competition.pendingInvites.length;
      const pendingMessage =
        pendingCount > 0
          ? ` You also have ${pendingCount} pending invite(s) reserving spots.`
          : "";
      return `Max players reached (${competition.maxPlayers}).${pendingMessage} Remove some players to continue.`;
    }
    if (hasConflicts) {
      return `Cannot invite: ${conflictedUsers
        .map((u) => formatDisplayName(u))
        .join(", ")}. Remove them to continue.`;
    }
    return "";
  };

  const blockingError = getBlockingError();
  const displayError = blockingError || validationError;
  const isInviteDisabled =
    sendingInvite || inviteUsers.length === 0 || !!blockingError;

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");
    navigation.goBack();
  };

  const handleSendInvite = async () => {
    setSendingInvite(true);
    setValidationError("");

    try {
      if (inviteUsers.length === 0) {
        setValidationError("Please select at least one player to invite");
        setSendingInvite(false);
        return;
      }

      const notificationType =
        competitionType === COMPETITION_TYPES.LEAGUE
          ? notificationTypes.ACTION.INVITE.LEAGUE
          : notificationTypes.ACTION.INVITE.TOURNAMENT;

      const metaDataId =
        competitionType === COMPETITION_TYPES.LEAGUE
          ? "leagueId"
          : "tournamentId";

      for (const user of inviteUsers) {
        const payload = {
          ...notificationSchema,
          createdAt: new Date(),
          recipientId: user.userId,
          senderId: currentUserId,
          message: `You've been invited to join ${competition.name}`,
          type: notificationType,
          data: {
            [metaDataId]: competition.id,
          },
        };

        await sendNotification(payload);
        await updatePendingInvites(competition.id, user.userId, collectionName);
      }

      handleShowPopup("Players invited successfully!");
      setInviteUsers([]);
      setSearchUser("");
      setSuggestions([]);
    } catch (error) {
      setValidationError("Failed to send invites. Please try again.");
      console.error("Error sending invites:", error);
    } finally {
      setSendingInvite(false);
    }
  };

  const fetchSuggestions = useCallback(
    debounce(async (value: string) => {
      try {
        if (!currentUserId) return;

        const searchTerm = value.toLowerCase().trim();
        const q = query(collection(db, "users"));
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(
          (doc) => doc.data() as UserProfile,
        );

        const filteredUsers = users.filter((user) => {
          const firstName = user.firstName?.toLowerCase() || "";
          const lastName = user.lastName?.toLowerCase() || "";
          const fullName = `${firstName} ${lastName}`;

          const matchesSearch =
            firstName.startsWith(searchTerm) ||
            lastName.startsWith(searchTerm) ||
            fullName.startsWith(searchTerm);

          return (
            matchesSearch &&
            user.userId !== currentUserId &&
            !inviteUsers.some((u) => u.userId === user.userId)
          );
        });

        setSuggestions(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }, 400),
    [currentUserId, inviteUsers],
  );

  const handleSearch = (value: string) => {
    setSearchUser(value);
    setSuggestions([]);
    if (value.trim().length >= 2) fetchSuggestions(value);
  };

  const handleSelectUser = (user: UserProfile) => {
    setInviteUsers((prev) => [...prev, user]);
    setSearchUser("");
    setSuggestions([]);
    setValidationError("");
  };

  const handleRemoveUser = (userId: string) => {
    setInviteUsers((prev) => prev.filter((u) => u.userId !== userId));
    setValidationError("");
  };

  const handleAddFromRecent = (players: UserProfile[]) => {
    setInviteUsers(players);
  };

  const handleShare = async () => {
    const type =
      competitionType === COMPETITION_TYPES.LEAGUE ? "league" : "tournament";
    const url = `https://courtchamps.com/preview/${type}/${competition.id}`;
    try {
      await Share.share({
        message: `You've been invited to join my ${competitionVariant} on Court Champs! 🏸\n\n${url}`,
        url,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const numberOfPlayers = `${competition.participants?.length || 0} / ${competition.maxPlayers}`;
  const competitionVariant =
    competitionType === COMPETITION_TYPES.LEAGUE ? "League" : "Tournament";

  const qrUrl = `https://courtchamps.com/preview/${
    competitionType === COMPETITION_TYPES.LEAGUE ? "league" : "tournament"
  }/${competition.id}`;

  return (
    <Container>
      <Popup
        visible={showPopup}
        message={popupMessage}
        onClose={handleClosePopup}
        type="success"
        height={450}
      />

      <QRModal
        visible={qrVisible}
        onClose={() => setQrVisible(false)}
        competitionName={competition.name}
        competitionVariant={competitionVariant}
        qrUrl={qrUrl}
      />

      <RecentPlayersModal
        visible={recentPlayersVisible}
        onClose={() => {
          setRecentPlayersVisible(false);
          setActiveTab("search");
        }}
        onAddPlayers={handleAddFromRecent}
        currentUserId={currentUserId}
        alreadySelected={inviteUsers}
      />

      <Header>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="white" />
        </TouchableOpacity>
      </Header>

      <FixedSection>
        <LeagueDetailsContainer>
          <LeagueName>{competition.name}</LeagueName>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <LeagueLocation>
              {competition.location.courtName}, {competition.location.city}
            </LeagueLocation>
            <QRButton onPress={() => setQrVisible(true)}>
              <AntDesign name="qrcode" size={13} color="#00A2FF" />
            </QRButton>
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: 5,
              marginTop: 10,
              alignItems: "center",
            }}
          >
            <Tag
              name={numberOfPlayers}
              color={"rgba(0, 0, 0, 0.7)"}
              iconColor={"#00A2FF"}
              iconSize={15}
              icon={"person"}
              iconPosition={"right"}
              bold
            />
            <Tag name={competition.type} />
            <Tag name={competition.prizeType} />
            <ShareButton onPress={handleShare}>
              <AntDesign name="sharealt" size={13} color="#00A2FF" />
              <ShareButtonText>Share {competitionVariant}</ShareButtonText>
            </ShareButton>
          </View>
        </LeagueDetailsContainer>

        <TabRow>
          <Tab
            active={activeTab === "search"}
            onPress={() => setActiveTab("search")}
          >
            <TabText active={activeTab === "search"}>Search</TabText>
          </Tab>
          <Tab
            active={activeTab === "recent"}
            onPress={() => {
              setActiveTab("recent");
              setRecentPlayersVisible(true);
            }}
          >
            <TabText active={activeTab === "recent"}>Recent Players</TabText>
          </Tab>
        </TabRow>

        {activeTab === "search" && (
          <Input
            placeholder="Start typing to search players"
            placeholderTextColor="#999"
            value={searchUser}
            onChangeText={handleSearch}
          />
        )}
      </FixedSection>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
        >
          {activeTab === "search" && suggestions.length > 0 && (
            <DropdownContainer>
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.userId}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const isAlreadySelected = inviteUsers.some(
                    (u) => u.userId === item.userId,
                  );
                  return (
                    <DropdownItem
                      onPress={() =>
                        !isAlreadySelected && handleSelectUser(item)
                      }
                      disabled={isAlreadySelected}
                      style={{
                        backgroundColor: isAlreadySelected
                          ? "#444"
                          : "rgb(5, 34, 64)",
                        opacity: isAlreadySelected ? 0.6 : 1,
                      }}
                    >
                      <DropdownText>
                        {formatDisplayName(item)}
                        {isAlreadySelected && " (selected)"}
                      </DropdownText>
                      <DropdownText
                        style={{ color: "#aaa", fontStyle: "italic" }}
                      >
                        @ {item.username}
                      </DropdownText>
                    </DropdownItem>
                  );
                }}
              />
            </DropdownContainer>
          )}

          {inviteUsers.length > 0 && (
            <SelectedSection>
              <SelectedLabel>Selected ({inviteUsers.length})</SelectedLabel>
              <SelectedTagsRow>
                {inviteUsers.map((user) => {
                  const hasConflict = hasUserConflict(user.userId);
                  return (
                    <PlayerTag key={user.userId} hasConflict={hasConflict}>
                      <PlayerTagName hasConflict={hasConflict}>
                        {formatDisplayName(user)}
                      </PlayerTagName>
                      <TouchableOpacity
                        onPress={() => handleRemoveUser(user.userId)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <AntDesign
                          name="close"
                          size={11}
                          color={hasConflict ? "red" : "#aaa"}
                        />
                      </TouchableOpacity>
                    </PlayerTag>
                  );
                })}
              </SelectedTagsRow>
            </SelectedSection>
          )}

          <DisclaimerText>
            Please ensure you have arranged court reservation directly with the
            venue. Court Champs does not reserve any courts when you post a game
          </DisclaimerText>

          {displayError ? <ErrorText>{displayError}</ErrorText> : null}
        </ScrollView>
      </TouchableWithoutFeedback>

      <BottomBar>
        <InviteButton
          onPress={handleSendInvite}
          disabled={isInviteDisabled}
          style={{ opacity: isInviteDisabled ? 0.6 : 1 }}
        >
          {sendingInvite ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <InviteText>Invite ({inviteUsers.length})</InviteText>
          )}
        </InviteButton>
      </BottomBar>
    </Container>
  );
};

// ─── QR Modal ────────────────────────────────────────────────────────────────

type QRModalProps = {
  visible: boolean;
  onClose: () => void;
  competitionName: string;
  competitionVariant: string;
  qrUrl: string;
};

const QR_SIZE = 240;

const QRModal = ({
  visible,
  onClose,
  competitionName,
  competitionVariant,
  qrUrl,
}: QRModalProps) => {
  const [qrData, setQrData] = useState<{
    data: Uint8Array;
    size: number;
  } | null>(null);

  useEffect(() => {
    if (!visible) return;
    QRCodeLib.create(qrUrl, { errorCorrectionLevel: "M" }).then((qr) => {
      setQrData({ data: qr.modules.data, size: qr.modules.size });
    });
  }, [visible, qrUrl]);

  const cellSize = qrData ? QR_SIZE / qrData.size : 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <QRContainer>
        <TouchableOpacity
          onPress={onClose}
          style={{ position: "absolute", top: 50, right: 20, zIndex: 10 }}
        >
          <AntDesign name="closecircleo" size={30} color="white" />
        </TouchableOpacity>

        <QRTitle>{competitionName}</QRTitle>
        <QRSubtitle>
          Scan to join this {competitionVariant.toLowerCase()}
        </QRSubtitle>

        <QRCard>
          {qrData ? (
            <Svg width={QR_SIZE} height={QR_SIZE}>
              {Array.from(qrData.data).map((bit, index) => {
                if (!bit) return null;
                const x = (index % qrData.size) * cellSize;
                const y = Math.floor(index / qrData.size) * cellSize;
                return (
                  <Rect
                    key={index}
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    fill="#00152B"
                  />
                );
              })}
            </Svg>
          ) : (
            <ActivityIndicator color="#00152B" size="large" />
          )}
        </QRCard>

        <QRHint>Screenshot or share this code with players</QRHint>
      </QRContainer>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const Container = styled(SafeAreaView)({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 20,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(255,255,255,0.08)",
});

const FixedSection = styled.View({
  paddingHorizontal: 20,
  paddingTop: 10,
});

const LeagueDetailsContainer = styled.View({
  paddingVertical: 20,
  width: "100%",
});

const LeagueName = styled.Text({
  fontSize: 20,
  fontWeight: "bold",
  color: "white",
  marginBottom: 6,
});

const LeagueLocation = styled.Text({
  fontSize: 13,
  color: "#888",
  marginBottom: 4,
});

const Input = styled.TextInput({
  width: "100%",
  padding: 12,
  marginBottom: 12,
  backgroundColor: "#141d2b",
  color: "#fff",
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.08)",
  fontSize: 15,
});

const DropdownContainer = styled.View({
  backgroundColor: "rgb(4, 26, 49)",
  borderRadius: 8,
  padding: 8,
  marginBottom: 12,
  width: "100%",
});

const DropdownItem = styled.TouchableOpacity({
  backgroundColor: "rgb(5, 34, 64)",
  borderRadius: 6,
  padding: 12,
  marginVertical: 4,
  justifyContent: "space-between",
  flexDirection: "row",
});

const DropdownText = styled.Text({
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "500",
});

const SelectedSection = styled.View({
  marginTop: 16,
  marginBottom: 12,
});

const SelectedLabel = styled.Text({
  color: "#aaa",
  fontSize: 12,
  marginBottom: 10,
});

const SelectedTagsRow = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
});

const PlayerTag = styled.View<{ hasConflict: boolean }>(
  ({ hasConflict }: { hasConflict: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: hasConflict ? "rgba(255,0,0,0.1)" : "rgba(0,162,255,0.12)",
    borderWidth: 1,
    borderColor: hasConflict ? "red" : "rgba(0,162,255,0.3)",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  }),
);

const PlayerTagName = styled.Text<{ hasConflict: boolean }>(
  ({ hasConflict }: { hasConflict: boolean }) => ({
    color: hasConflict ? "red" : "white",
    fontSize: 13,
    fontWeight: "500",
  }),
);

const DisclaimerText = styled.Text({
  color: "#666",
  fontStyle: "italic",
  fontSize: 11,
  textAlign: "left",
  marginTop: 16,
  marginBottom: 8,
});

const ErrorText = styled.Text({
  color: "red",
  fontSize: 12,
  fontStyle: "italic",
  textAlign: "left",
  marginVertical: 8,
});

const InviteButton = styled.TouchableOpacity({
  justifyContent: "center",
  alignItems: "center",
  padding: 14,
  borderRadius: 8,
  backgroundColor: "#00A2FF",
  marginTop: 16,
});

const InviteText = styled.Text({
  color: "white",
  fontWeight: "600",
  fontSize: 15,
});

const ShareButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  backgroundColor: "rgba(0, 162, 255, 0.1)",
  borderWidth: 1,
  borderColor: "#00A2FF",
  borderRadius: 5,
  paddingHorizontal: 8,
  paddingVertical: 4,
  marginLeft: "auto",
});

const ShareButtonText = styled.Text({
  color: "#00A2FF",
  fontSize: 12,
  fontWeight: "500",
});

const TabRow = styled.View({
  flexDirection: "row",
  width: "100%",
  marginBottom: 16,
  marginTop: 8,
  borderRadius: 8,
  padding: 4,
  gap: 6,
});

const Tab = styled.TouchableOpacity<{ active: boolean }>(
  ({ active }: { active: boolean }) => ({
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: active ? "#00A2FF" : "transparent",
  }),
);

const TabText = styled.Text<{ active: boolean }>(
  ({ active }: { active: boolean }) => ({
    color: active ? "white" : "#888",
    fontSize: 13,
    fontWeight: active ? "600" : "400",
  }),
);

const BottomBar = styled.View({
  padding: 16,
  paddingBottom: 30,
  borderTopWidth: 1,
  borderTopColor: "rgba(255,255,255,0.08)",
  backgroundColor: "rgb(3, 16, 31)",
});

const QRButton = styled.TouchableOpacity({
  backgroundColor: "rgba(0, 162, 255, 0.1)",
  borderWidth: 1,
  borderColor: "#00A2FF",
  borderRadius: 5,
  paddingHorizontal: 8,
  paddingVertical: 4,
});

const QRContainer = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  justifyContent: "center",
  alignItems: "center",
  padding: 30,
});

const QRTitle = styled.Text({
  fontSize: 22,
  fontWeight: "bold",
  color: "white",
  textAlign: "center",
  marginBottom: 8,
});

const QRSubtitle = styled.Text({
  fontSize: 14,
  color: "#888",
  textAlign: "center",
  marginBottom: 40,
});

const QRCard = styled.View({
  backgroundColor: "white",
  padding: 24,
  borderRadius: 16,
  shadowColor: "#00A2FF",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.4,
  shadowRadius: 20,
  width: QR_SIZE + 48,
  height: QR_SIZE + 48,
  justifyContent: "center",
  alignItems: "center",
});

const QRHint = styled.Text({
  fontSize: 13,
  color: "#666",
  textAlign: "center",
  marginTop: 32,
  fontStyle: "italic",
});

export default InvitePlayer;
