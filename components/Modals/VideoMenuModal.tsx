import React, { useState, useEffect, useContext } from "react";
import {
  Modal,
  Share,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { GameVideo } from "@shared/types";
import { COMPETITION_TYPES } from "@shared";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { getFunctions, httpsCallable } from "firebase/functions";
import { UserContext } from "../../context/UserContext";
import { LeagueContext } from "../../context/LeagueContext";
import ReportVideoModal from "./ReportVideoModal";
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
  const { toggleSaveVideo, checkVideoSaved } = useContext(LeagueContext);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingSaved, setIsCheckingSaved] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showBottomToast } = useContext(PopupContext);

  const videoId = `${video.gameId}_${video.postedBy.userId}`;
  const isOwnVideo = currentUser?.userId === video.postedBy.userId;
  const showRequestToJoin = !isSubmissionMode && !hideRequestToJoin;

  // ── Check if already saved on open ───────────────────────────────────────
  useEffect(() => {
    if (!visible || !currentUser || hideSave) return;
    setIsCheckingSaved(true);
    checkVideoSaved({ videoId, userId: currentUser.userId })
      .then((saved) => setIsSaved(saved))
      .finally(() => setIsCheckingSaved(false));
  }, [visible, currentUser]);

  const handleRequestToJoin = () => {
    onClose();
    const route =
      video.competitionType === COMPETITION_TYPES.TOURNAMENT
        ? "Tournament"
        : "League";
    const idKey =
      video.competitionType === COMPETITION_TYPES.TOURNAMENT
        ? "tournamentId"
        : "leagueId";
    navigation.navigate(route, { [idKey]: video.competitionId });
  };

  const handleShareVideo = async () => {
    onClose();
    try {
      await Share.share({
        message: `Check out this game on Court Champs! ${video.videoUrl}`,
        url: video.videoUrl,
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

  return (
    <>
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
                <AntDesign name="closecircleo" size={26} color="red" />
              </TouchableOpacity>
            </MenuHeader>

            {/* ── Request to Join ── */}
            {showRequestToJoin && (
              <MenuItem onPress={handleRequestToJoin}>
                <MenuItemIcon>
                  <Ionicons name="enter-outline" size={22} color="#00A2FF" />
                </MenuItemIcon>
                <MenuItemText>Request to Join Competition</MenuItemText>
                <Ionicons name="chevron-forward" size={20} color="#555" />
              </MenuItem>
            )}

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
      </Modal>

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
    </>
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

const MenuItem = styled.TouchableOpacity<{ isLast?: boolean }>(
  ({ isLast }: { isLast?: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: isLast ? 0 : 1,
    borderBottomColor: "#1a2b3d",
  }),
);

const MenuItemIcon = styled.View<{ isDestructive?: boolean }>(
  ({ isDestructive }: { isDestructive?: boolean }) => ({
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDestructive
      ? "rgba(255, 75, 110, 0.1)"
      : "rgba(0, 162, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  }),
);

const MenuItemText = styled.Text<{ isDestructive?: boolean }>(
  ({ isDestructive }: { isDestructive?: boolean }) => ({
    flex: 1,
    color: isDestructive ? "#FF4B6E" : "white",
    fontSize: 16,
    fontWeight: "500",
  }),
);

export default VideoMenuModal;
