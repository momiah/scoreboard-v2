import React, { useState, useEffect, useContext } from "react";
import {
  Modal,
  Share,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { GameVideo, Player, SelectedPlayers } from "@shared/types";
import { COMPETITION_TYPES, COLLECTION_NAMES, CollectionName } from "@shared";
import { getFunctions, httpsCallable } from "firebase/functions";
import { UserContext } from "../../context/UserContext";
import { LeagueContext } from "../../context/LeagueContext";
import ReportVideoModal from "./ReportVideoModal";
import CourtPositionsModal from "./CourtPositionModal";
import { PopupContext } from "@/context/PopupContext";

interface VideoMenuModalProps {
  visible: boolean;
  onClose: () => void;
  video: GameVideo;
  isSubmissionMode?: boolean;
  hideSave?: boolean;
  hideReport?: boolean;
  hideRequestToJoin?: boolean;
  onVideoDeleted?: () => void;
}

const VideoMenuModal: React.FC<VideoMenuModalProps> = ({
  visible,
  onClose,
  video,
  isSubmissionMode = false,
  hideSave = false,
  hideReport = false,
  hideRequestToJoin = false,
  onVideoDeleted,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { currentUser } = useContext(UserContext);
  const {
    toggleSaveVideo,
    checkVideoSaved,
    saveVideoCourtPositions,
    requestToJoinLeague,
    withdrawJoinRequest,
    fetchCompetitionById,
  } = useContext(LeagueContext);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [courtModalVisible, setCourtModalVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingSaved, setIsCheckingSaved] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isInvitePending, setIsInvitePending] = useState(false);
  const [isRequestPending, setIsRequestPending] = useState(false);
  const [isCheckingRequest, setIsCheckingRequest] = useState(true);
  const [isTogglingRequest, setIsTogglingRequest] = useState(false);
  const { showBottomToast } = useContext(PopupContext);

  const videoId = `${video.gameId}_${video.postedBy.userId}`;
  const isOwnVideo = currentUser?.userId === video.postedBy.userId;
  const showJoinRow = !isSubmissionMode && !hideRequestToJoin;

  const collectionName =
    video.competitionType === COMPETITION_TYPES.TOURNAMENT
      ? COLLECTION_NAMES.tournaments
      : COLLECTION_NAMES.leagues;

  // ── Players available for court assignment (from the game's two teams) ───
  const courtPlayers: Player[] = [
    video.teams.team1?.player1,
    video.teams.team1?.player2,
    video.teams.team2?.player1,
    video.teams.team2?.player2,
  ].filter((player): player is Player => Boolean(player));

  // ── Check if already saved on open ───────────────────────────────────────
  useEffect(() => {
    if (!visible || !currentUser || hideSave) return;
    setIsCheckingSaved(true);
    checkVideoSaved({ videoId, userId: currentUser.userId })
      .then((saved) => setIsSaved(saved))
      .finally(() => setIsCheckingSaved(false));
  }, [visible, currentUser]);

  // ── Check participant / invite / request state on open (single read) ─────
  useEffect(() => {
    if (!visible || !currentUser || !showJoinRow) return;
    setIsCheckingRequest(true);
    fetchCompetitionById({
      competitionId: video.competitionId,
      collectionName: collectionName as CollectionName,
      setState: false,
    })
      .then((competition) => {
        if (!competition) {
          setIsParticipant(false);
          setIsInvitePending(false);
          setIsRequestPending(false);
          return;
        }

        const userId = currentUser.userId;
        const participantIds: string[] = competition.participantIds || [];
        const pendingInvites = competition.pendingInvites || [];
        const pendingRequests = competition.pendingRequests || [];

        setIsParticipant(participantIds.includes(userId));
        setIsInvitePending(
          pendingInvites.some((invite) => invite.userId === userId),
        );
        setIsRequestPending(
          pendingRequests.some((request) => request.userId === userId),
        );
      })
      .finally(() => setIsCheckingRequest(false));
  }, [visible, currentUser]);

  const handleToggleJoinRequest = async () => {
    if (
      !currentUser ||
      isTogglingRequest ||
      isCheckingRequest ||
      isParticipant ||
      isInvitePending
    )
      return;
    setIsTogglingRequest(true);
    try {
      if (isRequestPending) {
        await withdrawJoinRequest({
          competitionId: video.competitionId,
          userId: currentUser.userId,
          collectionName: collectionName as CollectionName,
        });
        setIsRequestPending(false);
        showBottomToast("Request withdrawn", "success");
      } else {
        const requestSent = await requestToJoinLeague({
          competitionId: video.competitionId,
          currentUser,
          ownerId: video.postedBy.userId,
          collectionName: collectionName as CollectionName,
        });
        if (requestSent) {
          setIsRequestPending(true);
          showBottomToast("Request to join sent", "success");
        } else {
          showBottomToast("Unable to send request. Please try again.", "error");
        }
      }
    } catch (error) {
      console.error("[VideoMenuModal] Failed to toggle join request:", error);
      showBottomToast("Something went wrong. Please try again.", "error");
    } finally {
      setIsTogglingRequest(false);
    }
  };

  // ── Navigate the user to their own Pending Invites screen ────────────────
  const handleViewPendingInvites = () => {
    onClose();
    navigation.navigate("UserPendingInvites", {
      userId: currentUser?.userId,
    });
  };

  const handleShareVideo = async () => {
    onClose();
    try {
      const docId = `${video.gameId}_${video.postedBy.userId}`;
      const shareUrl = `https://courtchamps.com/og/videos?v=${docId}`;
      await Share.share({
        message: `Check out this game on Court Champs! ${shareUrl}`,
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };
  const handleSaveVideo = async () => {
    if (!currentUser || isSaving) return;
    setIsSaving(true);
    try {
      const nowSaved = await toggleSaveVideo({
        videoId,
        userId: currentUser.userId,
        username: currentUser.username,
        video,
      });
      setIsSaved(nowSaved);
    } catch (error) {
      console.error("[VideoMenuModal] Failed to toggle save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReport = () => {
    setReportModalVisible(true);
  };

  const handleViewCourtPositions = () => {
    setCourtModalVisible(true);
  };

  const handleSaveCourtPositions = async (positions: SelectedPlayers) => {
    if (!currentUser) return;
    await saveVideoCourtPositions({
      videoId,
      userId: currentUser.userId,
      courtPositions: positions,
    });
    showBottomToast("Court positions saved", "success");
  };

  const handleDelete = async () => {
    if (!currentUser || isDeleting) return;

    Alert.alert(
      "Delete Video",
      "Are you sure you want to delete this video? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const functions = getFunctions();
              const deleteVideoFn = httpsCallable(functions, "deleteVideo");
              await deleteVideoFn({
                docId: videoId,
                videoUrl: video.videoUrl,
                gameId: video.gameId,
                competitionId: video.competitionId,
                competitionType: video.competitionType,
                requestingUserId: currentUser.userId,
              });
              onClose();
              showBottomToast("Video deleted successfully", "success");
              onVideoDeleted?.();
            } catch (error) {
              console.error("[VideoMenuModal] Failed to delete video:", error);
              showBottomToast(
                "Failed to delete video. Please try again.",
                "error",
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  // ── Resolve the single join-row presentation ─────────────────────────────
  const isLocked = isParticipant || isInvitePending;
  const lockedLabel = isParticipant
    ? "Already in Competition"
    : "Invitation Pending";
  const lockedIcon = isParticipant
    ? "checkmark-circle-outline"
    : "mail-outline";

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <MenuOverlay>
        <MenuContent>
          <MenuHeader>
            <MenuTitle>Options</MenuTitle>
            <TouchableOpacity onPress={onClose}>
              <AntDesign name="close-circle" size={26} color="red" />
            </TouchableOpacity>
          </MenuHeader>

          {/* ── Join state: locked (participant/invited) / request / withdraw ── */}
          {showJoinRow &&
            (isLocked ? (
              isInvitePending ? (
                <MenuItem onPress={handleViewPendingInvites}>
                  <MenuItemIcon>
                    <Ionicons name={lockedIcon} size={22} color="#00A2FF" />
                  </MenuItemIcon>
                  <MenuItemText style={{ color: "#00A2FF" }}>
                    {lockedLabel}
                  </MenuItemText>
                  <Ionicons name="chevron-forward" size={20} color="#555" />
                </MenuItem>
              ) : (
                <MenuItem disabled isDisabled>
                  <MenuItemIcon isDisabled>
                    <Ionicons name={lockedIcon} size={22} color="#4A5A6A" />
                  </MenuItemIcon>
                  <MenuItemText isDisabled>{lockedLabel}</MenuItemText>
                </MenuItem>
              )
            ) : (
              <MenuItem
                onPress={handleToggleJoinRequest}
                disabled={isTogglingRequest || isCheckingRequest}
              >
                <MenuItemIcon isDestructive={isRequestPending}>
                  <Ionicons
                    name={isRequestPending ? "exit-outline" : "enter-outline"}
                    size={22}
                    color={isRequestPending ? "#FF4B6E" : "#00A2FF"}
                  />
                </MenuItemIcon>
                <MenuItemText isDestructive={isRequestPending}>
                  {isRequestPending
                    ? "Withdraw Request to Join"
                    : "Request to Join Competition"}
                </MenuItemText>
                {isCheckingRequest || isTogglingRequest ? (
                  <ActivityIndicator
                    size="small"
                    color={isRequestPending ? "#FF4B6E" : "#00A2FF"}
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#555" />
                )}
              </MenuItem>
            ))}

          {/* ── Court Positions ── */}
          <MenuItem onPress={handleViewCourtPositions}>
            <MenuItemIcon>
              <Ionicons name="grid-outline" size={22} color="#00A2FF" />
            </MenuItemIcon>
            <MenuItemText>View Court Positions</MenuItemText>
            <Ionicons name="chevron-forward" size={20} color="#555" />
          </MenuItem>

          {/* ── Share ── */}
          <MenuItem onPress={handleShareVideo}>
            <MenuItemIcon>
              <Ionicons name="share-outline" size={22} color="#00A2FF" />
            </MenuItemIcon>
            <MenuItemText>Share Video</MenuItemText>
            <Ionicons name="chevron-forward" size={20} color="#555" />
          </MenuItem>

          {/* ── Save ── */}
          {!hideSave && (
            <MenuItem onPress={handleSaveVideo}>
              <MenuItemIcon>
                <Ionicons name="bookmark-outline" size={22} color="#00A2FF" />
              </MenuItemIcon>
              <MenuItemText>{isSaved ? "Saved" : "Save Video"}</MenuItemText>
              {isCheckingSaved || isSaving ? (
                <ActivityIndicator size="small" color="#00A2FF" />
              ) : (
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color={isSaved ? "#00A2FF" : "#555"}
                />
              )}
            </MenuItem>
          )}

          {/* ── Report ── */}
          {!hideReport && (
            <MenuItem onPress={handleReport} isLast={!isOwnVideo}>
              <MenuItemIcon isDestructive>
                <Ionicons name="flag-outline" size={22} color="#FF4B6E" />
              </MenuItemIcon>
              <MenuItemText isDestructive>Report Video</MenuItemText>
              <Ionicons name="chevron-forward" size={20} color="#555" />
            </MenuItem>
          )}

          {/* ── Delete — own videos only ── */}
          {isOwnVideo && (
            <MenuItem onPress={handleDelete} isLast>
              <MenuItemIcon isDestructive>
                <Ionicons name="trash-outline" size={22} color="#FF4B6E" />
              </MenuItemIcon>
              <MenuItemText isDestructive>
                {isDeleting ? "Deleting..." : "Delete Video"}
              </MenuItemText>
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FF4B6E" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#555" />
              )}
            </MenuItem>
          )}
        </MenuContent>
      </MenuOverlay>

      {currentUser && (
        <ReportVideoModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          video={video}
          reportedBy={{
            userId: currentUser.userId,
            username: currentUser.username,
          }}
        />
      )}

      <CourtPositionsModal
        visible={courtModalVisible}
        onClose={() => setCourtModalVisible(false)}
        video={video}
        isUploader={isOwnVideo}
        playerArray={courtPlayers}
        onSave={handleSaveCourtPositions}
      />
    </Modal>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const MenuOverlay = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "flex-end",
});

const MenuContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingBottom: 40,
});

const MenuHeader = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 20,
  borderBottomWidth: 1,
  borderBottomColor: "#1a2b3d",
});

const MenuTitle = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
});

const MenuItem = styled.TouchableOpacity<{
  isLast?: boolean;
  isDisabled?: boolean;
}>(({ isLast, isDisabled }: { isLast?: boolean; isDisabled?: boolean }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderBottomWidth: isLast ? 0 : 1,
  borderBottomColor: "#1a2b3d",
  opacity: isDisabled ? 0.45 : 1,
}));

const MenuItemIcon = styled.View<{
  isDestructive?: boolean;
  isDisabled?: boolean;
}>(
  ({
    isDestructive,
    isDisabled,
  }: {
    isDestructive?: boolean;
    isDisabled?: boolean;
  }) => ({
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDisabled
      ? "rgba(74, 90, 106, 0.1)"
      : isDestructive
        ? "rgba(255, 75, 110, 0.1)"
        : "rgba(0, 162, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  }),
);

const MenuItemText = styled.Text<{
  isDestructive?: boolean;
  isDisabled?: boolean;
}>(
  ({
    isDestructive,
    isDisabled,
  }: {
    isDestructive?: boolean;
    isDisabled?: boolean;
  }) => ({
    flex: 1,
    color: isDisabled ? "#4A5A6A" : isDestructive ? "#FF4B6E" : "white",
    fontSize: 16,
    fontWeight: "500",
  }),
);

export default VideoMenuModal;
