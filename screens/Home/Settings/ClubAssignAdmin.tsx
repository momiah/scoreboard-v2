import React, { useEffect, useState, useContext } from "react";
import { FlatList, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import {
  useNavigation,
  useRoute,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { LeagueContext } from "../../../context/LeagueContext";
import { UserContext } from "../../../context/UserContext";
import Tag from "../../../components/Tag";
import { Club, CompetitionAdmins, Player } from "@shared/types";

const ClubAssignAdmin = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const route = useRoute();
  const { clubId } = route.params as { clubId: string };

  const { currentUser } = useContext(UserContext);
  const {
    fetchClubById,
    fetchClubParticipants,
    assignClubAdmin,
    revokeClubAdmin,
  } = useContext(LeagueContext);

  const [club, setClub] = useState<Club | null>(null);
  const [participants, setParticipants] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClub();
  }, []);

  const fetchClub = async () => {
    setLoading(true);
    try {
      const [fetchedClub, fetchedParticipants] = await Promise.all([
        fetchClubById(clubId),
        fetchClubParticipants(clubId),
      ]);
      setClub(fetchedClub);
      setParticipants(fetchedParticipants);
    } catch (error) {
      console.error("Failed to fetch club:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (user: Player) => {
    if (!user.userId) return;
    await assignClubAdmin({
      clubId,
      user: { userId: user.userId, username: user.username ?? "" },
    });
    fetchClub();
  };

  const handleRevoke = async (userId: string) => {
    await revokeClubAdmin({ clubId, userId });
    fetchClub();
  };

  const goToProfile = (userId: string) => {
    navigation.navigate("UserProfile", { userId });
  };

  const isAdmin = (userId: string | undefined) =>
    userId
      ? club?.clubAdmins?.some(
          (admin: CompetitionAdmins) => admin.userId === userId,
        )
      : false;

  const renderItem = ({ item }: { item: Player }) => {
    const isUserAdmin = isAdmin(item.userId);
    const isOwner = item.userId === club?.clubOwner?.userId;
    const isCurrentUser = item.userId === currentUser?.userId;

    const canAssign = !isUserAdmin && !isCurrentUser && !isOwner;
    const canRevoke =
      isUserAdmin &&
      currentUser?.userId === club?.clubOwner?.userId &&
      !isOwner;

    return (
      <PlayerRow onPress={() => item.userId && goToProfile(item.userId)}>
        <Player_>
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
        </Player_>

        <Action>
          {canAssign && (
            <ActionButton onPress={() => handleAssign(item)}>
              <ButtonText>Assign</ButtonText>
            </ActionButton>
          )}
          {canRevoke && (
            <RevokeButton onPress={() => handleRevoke(item.userId!)}>
              <ButtonText>Revoke</ButtonText>
            </RevokeButton>
          )}
        </Action>
      </PlayerRow>
    );
  };

  if (loading || !club) {
    return (
      <LoadingContainer>
        <ActivityIndicator size="large" color="#00A2FF" />
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <Title>Assign Club Admins</Title>
      <FlatList
        data={participants}
        keyExtractor={(item, index) => item.userId ?? index.toString()}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <Separator />}
      />
    </Container>
  );
};

export default ClubAssignAdmin;

// --- Styled ---
const Container = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  padding: 20,
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

const Player_ = styled.View({
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
