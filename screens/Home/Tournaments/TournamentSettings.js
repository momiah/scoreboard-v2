import React, { useContext, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { useNavigation, useRoute } from "@react-navigation/native";
import { UserContext } from "../../../context/UserContext";
import { LeagueContext } from "../../../context/LeagueContext";
import { COLLECTION_NAMES } from "../../../schemas/schema";
import {
  getAuth,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

const TournamentSettings = () => {
  const route = useRoute();
  const { tournamentId, tournamentById } = route.params;
  const { currentUser } = useContext(UserContext);
  const { deleteCompetition } = useContext(LeagueContext);
  const navigation = useNavigation();
  const [deleting, setDeleting] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const menuOptions = [
    {
      label: "Edit Tournament",
      icon: "create-outline",
      action: "EditTournament",
    },
    {
      label: "Pending Invites",
      icon: "person-add-outline",
      action: "PendingInvites",
    },
    { label: "Assign Admin", icon: "people-outline", action: "AssignAdmin" },
    {
      label: "Remove Players",
      icon: "person-remove-outline",
      action: "RemovePlayers",
    },
    {
      label: "Bulk Publish Fixtures",
      icon: "archive-outline",
      action: "BulkFixturesPublisher",
    },
    {
      label: "Delete Tournament",
      icon: "trash-outline",
      action: "DeleteTournament",
      color: "red",
    },
  ];

  const isOwner =
    tournamentById?.tournamentOwner.userId === currentUser?.userId;
  const filteredMenuOptions = isOwner
    ? menuOptions
    : menuOptions.filter(
        (option) =>
          option.action !== "RemovePlayers" &&
          option.action !== "DeleteTournament",
      );

  const hasGamesPlayed = () => {
    const fixtures = tournamentById?.fixtures ?? [];
    return fixtures.some((fixture) =>
      fixture.games?.some((game) => game.approvalStatus === "Approved"),
    );
  };

  const handleDeletePress = () => {
    if (hasGamesPlayed()) {
      Alert.alert(
        "Cannot Delete Tournament",
        "This tournament cannot be deleted as games have already been played.",
      );
      return;
    }

    Alert.alert(
      "Delete Tournament",
      `Are you sure you want to delete "${tournamentById?.tournamentName}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setPassword("");
            setPasswordError("");
            setPasswordModalVisible(true);
          },
        },
      ],
    );
  };

  const handleConfirmDelete = async () => {
    if (!password.trim()) {
      setPasswordError("Please enter your password");
      return;
    }

    try {
      setDeleting(true);
      setPasswordError("");

      const auth = getAuth();
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      await deleteCompetition(COLLECTION_NAMES.tournaments, tournamentId);
      setPasswordModalVisible(false);
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (error) {
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        setPasswordError("Incorrect password. Please try again.");
      } else {
        Alert.alert("Error", "Failed to delete tournament. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const handlePress = (action) => {
    if (action === "DeleteTournament") {
      handleDeletePress();
      return;
    }
    navigation.navigate(action, {
      tournamentId,
      tournamentById,
      collectionName: COLLECTION_NAMES.tournaments,
    });
  };

  return (
    <Container>
      <Modal
        transparent
        animationType="fade"
        visible={passwordModalVisible}
        onRequestClose={() => !deleting && setPasswordModalVisible(false)}
      >
        <BlurView style={styles.blurContainer} intensity={50} tint="dark">
          <PasswordModal>
            <PasswordTitle>Confirm Deletion</PasswordTitle>
            <PasswordSubtitle>
              Enter your password to permanently delete this tournament
            </PasswordSubtitle>
            <PasswordInput
              placeholder="Enter password"
              placeholderTextColor="#666"
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError("");
              }}
              autoFocus
            />
            {passwordError ? (
              <PasswordError>{passwordError}</PasswordError>
            ) : null}
            <ModalButtonRow>
              <ModalCancelButton
                onPress={() => setPasswordModalVisible(false)}
                disabled={deleting}
              >
                <ModalCancelText>Cancel</ModalCancelText>
              </ModalCancelButton>
              <ModalDeleteButton
                onPress={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ModalDeleteText>Delete</ModalDeleteText>
                )}
              </ModalDeleteButton>
            </ModalButtonRow>
          </PasswordModal>
        </BlurView>
      </Modal>

      <Header>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <HeaderTitle>Tournament Settings</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>

      <MenuList>
        {filteredMenuOptions.map((option) => (
          <MenuItem
            key={option.label}
            onPress={() => handlePress(option.action)}
          >
            <LeftContainer>
              <Ionicons
                name={option.icon}
                size={20}
                color={option.color ?? "white"}
              />
              <MenuText style={{ color: option.color ?? "white" }}>
                {option.label}
              </MenuText>
            </LeftContainer>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </MenuItem>
        ))}
      </MenuList>
    </Container>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

const Container = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  padding: 20,
});

const Header = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 30,
});

const HeaderTitle = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const MenuList = styled.View({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 12,
  paddingVertical: 10,
});

const MenuItem = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 15,
  paddingHorizontal: 20,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: "rgba(255, 255, 255, 0.1)",
});

const LeftContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 15,
});

const MenuText = styled.Text({
  color: "white",
  fontSize: 16,
});

const PasswordModal = styled.View({
  backgroundColor: "rgb(3, 16, 31)",
  borderRadius: 16,
  padding: 24,
  width: "85%",
  borderWidth: 1,
  borderColor: "rgba(255, 59, 48, 0.3)",
});

const PasswordTitle = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
  marginBottom: 8,
});

const PasswordSubtitle = styled.Text({
  color: "#aaa",
  fontSize: 14,
  marginBottom: 20,
  lineHeight: 20,
});

const PasswordInput = styled.TextInput({
  backgroundColor: "rgba(255, 255, 255, 0.08)",
  borderRadius: 8,
  padding: 12,
  color: "white",
  fontSize: 16,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.15)",
  marginBottom: 8,
});

const PasswordError = styled.Text({
  color: "#FF3B30",
  fontSize: 13,
  marginBottom: 12,
});

const ModalButtonRow = styled.View({
  flexDirection: "row",
  gap: 12,
  marginTop: 20,
});

const ModalCancelButton = styled.TouchableOpacity({
  flex: 1,
  padding: 14,
  borderRadius: 8,
  backgroundColor: "rgba(255, 255, 255, 0.08)",
  alignItems: "center",
});

const ModalCancelText = styled.Text({
  color: "white",
  fontSize: 16,
  fontWeight: "500",
});

const ModalDeleteButton = styled.TouchableOpacity({
  flex: 1,
  padding: 14,
  borderRadius: 8,
  backgroundColor: "#FF3B30",
  alignItems: "center",
});

const ModalDeleteText = styled.Text({
  color: "white",
  fontSize: 16,
  fontWeight: "bold",
});

export default TournamentSettings;
