import React, { useContext, useRef, useState } from "react";
import { ActivityIndicator, Alert } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import {
  useNavigation,
  useRoute,
  StackActions,
  RouteProp,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";

import type { Ladder, TeamMember, UserProfile } from "@shared/types";
import { UserContext } from "../../../context/UserContext";
import { LadderContext } from "../../../context/LadderContext";
import { PopupContext } from "../../../context/PopupContext";
import { uploadTeamImage } from "../../../utils/UploadTeamImageToFirebase";
import { formatDisplayName } from "@/helpers/formatDisplayName";

interface CreateTeamParams {
  ladder?: Ladder;
}

const toTeamMember = (user: UserProfile): TeamMember => ({
  userId: user.userId,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  displayName: formatDisplayName(user),
  profileImage: user.profileImage,
});

const CreateTeam: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<Record<string, CreateTeamParams>, string>>();
  const ladder = route.params?.ladder;

  const { currentUser } = useContext(UserContext);
  const { createTeam, updateTeamProfilePic } = useContext(LadderContext);
  const { showBottomToast } = useContext(PopupContext);

  const [teamName, setTeamName] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pickInFlight = useRef(false);

  const handlePickImage = async () => {
    if (pickInFlight.current) return;
    pickInFlight.current = true;
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photos access",
          "Allow photo library access in Settings to set a team photo.",
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
      console.error("[CreateTeam] image pick failed:", error);
      Alert.alert("Image", "Could not process that photo. Try another image.");
    } finally {
      pickInFlight.current = false;
    }
  };

  const trimmedName = teamName.trim();
  const canSubmit = !!trimmedName && !submitting && !!currentUser?.userId;

  const handleCreate = async () => {
    if (!canSubmit || !currentUser?.userId) return;
    setSubmitting(true);
    try {
      const { success, team } = await createTeam(toTeamMember(currentUser), {
        teamName: trimmedName,
      });
      if (!success || !team?.teamId) {
        showBottomToast("Couldn't create the team. Please try again.", "error");
        return;
      }
      if (selectedImage) {
        const url = await uploadTeamImage(selectedImage, team.teamId);
        if (url) await updateTeamProfilePic(team.teamId, url);
      }
      navigation.dispatch(
        StackActions.replace("TeamDetails", { teamId: team.teamId, ladder }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Header>
        <BackButton
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID="create-team-back"
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </BackButton>
        <HeaderTitle numberOfLines={1}>Create a Team</HeaderTitle>
        <HeaderSpacer />
      </Header>

      <Body
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SubText>Give your doubles team a name and photo.</SubText>

        <AvatarWrap
          onPress={handlePickImage}
          activeOpacity={0.85}
          testID="create-team-photo"
        >
          {selectedImage ? (
            <Avatar source={{ uri: selectedImage }} />
          ) : (
            <AvatarPlaceholder>
              <Ionicons name="camera" size={26} color="#00A2FF" />
            </AvatarPlaceholder>
          )}
          <AvatarHint>{selectedImage ? "Change photo" : "Add photo"}</AvatarHint>
        </AvatarWrap>

        <FieldLabel>Team name</FieldLabel>
        <Input
          value={teamName}
          onChangeText={setTeamName}
          placeholder="e.g. Smash Bros"
          placeholderTextColor="#4A5A6A"
          maxLength={40}
          returnKeyType="done"
          testID="create-team-name"
        />
      </Body>

      <Footer>
        <CreateButton
          onPress={handleCreate}
          disabled={!canSubmit}
          isDisabled={!canSubmit}
          activeOpacity={0.85}
          testID="create-team-submit"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <CreateButtonText>Create Team</CreateButtonText>
          )}
        </CreateButton>
      </Footer>
    </Screen>
  );
};

export default CreateTeam;

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

const Footer = styled.View({
  paddingTop: 12,
  paddingBottom: 28,
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

const SubText = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  marginTop: 8,
  marginBottom: 20,
});

const AvatarWrap = styled.TouchableOpacity({
  alignItems: "center",
  gap: 8,
  marginBottom: 24,
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

const CreateButton = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: isDisabled ? "#1e3a52" : "#00A2FF",
    alignItems: "center",
    opacity: isDisabled ? 0.7 : 1,
  }),
);

const CreateButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
