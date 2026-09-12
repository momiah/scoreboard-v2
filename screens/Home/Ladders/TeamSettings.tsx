import React, { useCallback, useContext, useRef, useState } from "react";
import { ActivityIndicator, Alert } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  StackActions,
  RouteProp,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";

import type { TeamStats } from "@shared/types";
import { LadderContext } from "../../../context/LadderContext";
import { PopupContext } from "../../../context/PopupContext";
import { uploadTeamImage } from "../../../utils/UploadTeamImageToFirebase";
import TeamSettingsSkeleton from "../../../components/Skeletons/TeamSettingsSkeleton";

interface TeamSettingsParams {
  teamId: string;
}

const TeamSettings: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, TeamSettingsParams>, string>>();
  const { teamId } = route.params;

  const { fetchTeam, updateTeamDetails, disbandTeam } =
    useContext(LadderContext);
  const { showBottomToast } = useContext(PopupContext);

  const [team, setTeam] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [disbanding, setDisbanding] = useState(false);
  const pickInFlight = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await fetchTeam(teamId);
      setTeam(loaded);
      setTeamName(loaded?.teamName?.trim() ?? "");
    } catch (error) {
      console.error("[TeamSettings] Failed to load team:", error);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [teamId, fetchTeam]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handlePickImage = async () => {
    if (pickInFlight.current) return;
    pickInFlight.current = true;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photos access",
          "Allow photo library access in Settings to change the team photo.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]) {
        const cropped = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 600 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        setSelectedImage(cropped.uri);
      }
    } catch (error) {
      console.error("[TeamSettings] image pick failed:", error);
      Alert.alert("Image", "Could not process that photo. Try another image.");
    } finally {
      pickInFlight.current = false;
    }
  };

  const trimmedName = teamName.trim();
  const canSave = !!trimmedName && !saving && !loading && !!team;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      let teamProfilePic: string | undefined;
      if (selectedImage) {
        const url = await uploadTeamImage(selectedImage, teamId);
        if (url) teamProfilePic = url;
      }
      const ok = await updateTeamDetails(teamId, {
        teamName: trimmedName,
        ...(teamProfilePic ? { teamProfilePic } : {}),
      });
      if (ok) {
        showBottomToast("Team updated", "success");
        navigation.goBack();
      } else {
        showBottomToast("Couldn't save changes. Please try again.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const runDisband = async () => {
    if (!team) return;
    setDisbanding(true);
    try {
      const { success, activelyPlaying } = await disbandTeam(team);
      if (activelyPlaying) {
        Alert.alert(
          "Can't disband",
          "This team has matches in a ladder. Teams can't be disbanded once they've started playing.",
        );
        return;
      }
      if (success) {
        showBottomToast("Team disbanded", "success");
        navigation.dispatch(StackActions.pop(2));
      } else {
        showBottomToast("Couldn't disband. Please try again.", "error");
      }
    } finally {
      setDisbanding(false);
    }
  };

  const handleDisband = () => {
    Alert.alert(
      "Disband team",
      "This permanently deletes the team. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Disband", style: "destructive", onPress: runDisband },
      ],
    );
  };

  const photoUri = selectedImage ?? team?.teamProfilePic ?? null;

  return (
    <Screen>
      <Header>
        <BackButton
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID="team-settings-back"
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </BackButton>
        <HeaderTitle numberOfLines={1}>Team Settings</HeaderTitle>
        <HeaderSpacer />
      </Header>

      {loading ? (
        <TeamSettingsSkeleton />
      ) : !team ? (
        <EmptyText>This team could not be found.</EmptyText>
      ) : (
        <Body
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AvatarWrap
            onPress={handlePickImage}
            activeOpacity={0.85}
            testID="team-settings-photo"
          >
            {photoUri ? (
              <Avatar source={{ uri: photoUri }} />
            ) : (
              <AvatarPlaceholder>
                <Ionicons name="camera" size={26} color="#00A2FF" />
              </AvatarPlaceholder>
            )}
            <AvatarHint>Change photo</AvatarHint>
          </AvatarWrap>

          <FieldLabel>Team name</FieldLabel>
          <Input
            value={teamName}
            onChangeText={setTeamName}
            placeholder="e.g. Smash Bros"
            placeholderTextColor="#4A5A6A"
            maxLength={40}
            returnKeyType="done"
            testID="team-settings-name"
          />

          <SaveButton
            onPress={handleSave}
            disabled={!canSave}
            isDisabled={!canSave}
            activeOpacity={0.85}
            testID="team-settings-save"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <SaveButtonText>Save changes</SaveButtonText>
            )}
          </SaveButton>

          <DangerZone>
            <DangerLabel>Danger zone</DangerLabel>
            <DisbandButton
              onPress={handleDisband}
              disabled={disbanding}
              activeOpacity={0.85}
              testID="team-settings-disband"
            >
              {disbanding ? (
                <ActivityIndicator size="small" color="#f87171" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#f87171" />
                  <DisbandButtonText>Disband team</DisbandButtonText>
                </>
              )}
            </DisbandButton>
          </DangerZone>
        </Body>
      )}
    </Screen>
  );
};

export default TeamSettings;

const Screen = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  paddingHorizontal: 20,
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 20,
  paddingBottom: 12,
});

const Body = styled.ScrollView({
  flex: 1,
});

const BackButton = styled.TouchableOpacity({
  width: 32,
  justifyContent: "center",
});

const HeaderTitle = styled.Text({
  flex: 1,
  textAlign: "center",
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const HeaderSpacer = styled.View({
  width: 32,
});

const EmptyText = styled.Text({
  color: "#9fb8c8",
  fontSize: 14,
  textAlign: "center",
  paddingVertical: 32,
});

const AvatarWrap = styled.TouchableOpacity({
  alignItems: "center",
  gap: 8,
  paddingVertical: 20,
});

const Avatar = styled.Image({
  width: 96,
  height: 96,
  borderRadius: 48,
  backgroundColor: "#0a1929",
});

const AvatarPlaceholder = styled.View({
  width: 96,
  height: 96,
  borderRadius: 48,
  backgroundColor: "#0a1929",
  borderWidth: 1,
  borderColor: "#1a2b3d",
  justifyContent: "center",
  alignItems: "center",
});

const AvatarHint = styled.Text({
  color: "#00A2FF",
  fontSize: 13,
  fontWeight: "600",
});

const FieldLabel = styled.Text({
  color: "#e2e8f0",
  fontSize: 14,
  fontWeight: "600",
  marginBottom: 8,
});

const Input = styled.TextInput({
  backgroundColor: "#0a1929",
  borderWidth: 1,
  borderColor: "#1a2b3d",
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 14,
  color: "#e2e8f0",
  fontSize: 15,
});

const SaveButton = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: isDisabled ? "#1e3a52" : "#00A2FF",
    alignItems: "center",
    marginTop: 20,
    opacity: isDisabled ? 0.7 : 1,
  }),
);

const SaveButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const DangerZone = styled.View({
  marginTop: 40,
  gap: 10,
});

const DangerLabel = styled.Text({
  color: "#7f97a8",
  fontSize: 12,
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: 0.5,
});

const DisbandButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingVertical: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#7f1d1d",
  backgroundColor: "rgba(248, 113, 113, 0.08)",
});

const DisbandButtonText = styled.Text({
  color: "#f87171",
  fontSize: 16,
  fontWeight: "bold",
});
