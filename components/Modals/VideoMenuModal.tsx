import React from "react";
import { Modal, Share, Alert, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import { GameVideo } from "@shared/types";
import { COMPETITION_TYPES } from "@shared";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";

interface VideoMenuModalProps {
  visible: boolean;
  onClose: () => void;
  video: GameVideo;
}

const VideoMenuModal: React.FC<VideoMenuModalProps> = ({
  visible,
  onClose,
  video,
}) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

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

  const handleSaveVideo = () => {
    onClose();
    // TODO: implement save to camera roll using expo-media-library
    Alert.alert("Coming Soon", "Save video will be available soon.");
  };

  const handleReport = () => {
    onClose();
    Alert.alert("Report Video", "Are you sure you want to report this video?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: () => {
          // TODO: write report to Firestore
          Alert.alert("Reported", "Thank you for your report.");
        },
      },
    ]);
  };

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
              <AntDesign name="closecircleo" size={26} color="red" />
            </TouchableOpacity>
          </MenuHeader>

          <MenuItem onPress={handleRequestToJoin}>
            <MenuItemIcon>
              <Ionicons name="enter-outline" size={22} color="#00A2FF" />
            </MenuItemIcon>
            <MenuItemText>Request to Join Competition</MenuItemText>
            <Ionicons name="chevron-forward" size={20} color="#555" />
          </MenuItem>

          <MenuItem onPress={handleShareVideo}>
            <MenuItemIcon>
              <Ionicons name="share-outline" size={22} color="#00A2FF" />
            </MenuItemIcon>
            <MenuItemText>Share Video</MenuItemText>
            <Ionicons name="chevron-forward" size={20} color="#555" />
          </MenuItem>

          <MenuItem onPress={handleSaveVideo}>
            <MenuItemIcon>
              <Ionicons name="download-outline" size={22} color="#00A2FF" />
            </MenuItemIcon>
            <MenuItemText>Save Video</MenuItemText>
            <Ionicons name="chevron-forward" size={20} color="#555" />
          </MenuItem>

          <MenuItem onPress={handleReport} isLast>
            <MenuItemIcon isDestructive>
              <Ionicons name="flag-outline" size={22} color="#FF4B6E" />
            </MenuItemIcon>
            <MenuItemText isDestructive>Report Video</MenuItemText>
            <Ionicons name="chevron-forward" size={20} color="#555" />
          </MenuItem>
        </MenuContent>
      </MenuOverlay>
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
