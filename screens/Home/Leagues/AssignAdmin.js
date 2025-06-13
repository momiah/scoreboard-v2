import React, { useEffect, useState, useContext } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import styled from "styled-components/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LeagueContext } from "../../../context/LeagueContext";
import { UserContext } from "../../../context/UserContext";
import Tag from "../../../components/Tag";

const platformAdjustedPaddingTop = Platform.OS === "ios" ? undefined : 60; // Adjust for iOS platform

const AssignAdmin = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { leagueId, leagueById } = route.params;

  const { currentUser } = useContext(UserContext);
  const { assignLeagueAdmin, revokeLeagueAdmin, fetchLeagueById } =
    useContext(LeagueContext);

  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLeague = async () => {
    setLoading(true);
    setLeague(leagueById);
    setLoading(false);
  };

  useEffect(() => {
    loadLeague();
  }, []);

  const refetchLeague = async () => {
    setLoading(true);
    try {
      const fetchedLeague = await fetchLeagueById(leagueId);
      setLeague(fetchedLeague);
    } catch (error) {
      console.error("Failed to fetch league:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (user) => {
    await assignLeagueAdmin(leagueId, user);
    refetchLeague();
  };

  const handleRevoke = async (userId) => {
    await revokeLeagueAdmin(leagueId, userId);
    refetchLeague();
  };

  const goToProfile = (userId) => {
    navigation.navigate("UserProfile", { userId });
  };

  const isAdmin = (userId) =>
    league?.leagueAdmins?.some((admin) => admin.userId === userId);

  const renderItem = ({ item }) => {
    const isUserAdmin = isAdmin(item.userId);
    const isOwner = item.userId === league?.leagueOwner?.userId;
    const isCurrentUser = item.userId === currentUser?.userId;

    const canAssign = !isUserAdmin && !isCurrentUser && !isOwner;
    const canRevoke =
      isUserAdmin &&
      currentUser?.userId === league?.leagueOwner?.userId &&
      !isOwner;

    return (
      <PlayerRow onPress={() => goToProfile(item.userId)}>
        <Player>
          <Username>{item.username}</Username>
          {isUserAdmin && (
            <Tag
              name={"Admin"}
              color="rgb(3, 16, 31)"
              iconColor="#00A2FF"
              iconSize={15}
              icon={"checkmark-circle-outline"}
              iconPosition={"right"}
              bold
            />
          )}
        </Player>

        <Action>
          {canAssign && (
            <ActionButton onPress={() => handleAssign(item)}>
              <ButtonText>Assign</ButtonText>
            </ActionButton>
          )}
          {canRevoke && (
            <RevokeButton onPress={() => handleRevoke(item.userId)}>
              <ButtonText>Revoke</ButtonText>
            </RevokeButton>
          )}
        </Action>
      </PlayerRow>
    );
  };

  if (loading || !league) {
    return (
      <LoadingContainer>
        <ActivityIndicator size="large" color="#00A2FF" />
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Title>Assign League Admins</Title>
      <FlatList
        data={league.leagueParticipants}
        keyExtractor={(item) => item.userId}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <Separator />}
      />
    </Container>
  );
};

export default AssignAdmin;

// --- Styled ---
const Container = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  padding: 20,
  paddingTop: platformAdjustedPaddingTop,
});

const Title = styled.Text({
  color: "white",
  fontSize: 20,
  fontWeight: "bold",
  marginBottom: 20,
});

const PlayerRow = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "rgba(255,255,255,0.05)",
  padding: 12,
  borderRadius: 8,
});

const Player = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});

const Action = styled.View({
  flexDirection: "row",
  gap: 10,
});

const Username = styled.Text({
  color: "white",
  fontSize: 16,
});

const ActionButton = styled.TouchableOpacity({
  backgroundColor: "#00A2FF",
  paddingVertical: 6,
  paddingHorizontal: 14,
  borderRadius: 6,
  width: 80,
});

const RevokeButton = styled.TouchableOpacity({
  backgroundColor: "#e53935",
  paddingVertical: 6,
  paddingHorizontal: 14,
  borderRadius: 6,
  width: 80,
});

const ButtonText = styled.Text({
  color: "white",
  fontSize: 14,
  fontWeight: "bold",
});

const LoadingContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgb(3, 16, 31)",
});

const Separator = styled.View({
  height: 10,
});
