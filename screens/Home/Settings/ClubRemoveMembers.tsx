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
import RemovePlayerModal from "../../../components/Modals/RemovePlayerModal";
import { Club, CompetitionAdmins, Player } from "@shared/types";

const ClubRemoveMembers = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute();

  const { clubId } = route.params as { clubId: string };

  const { fetchClubById, fetchClubParticipants, removeClubMember } =
    useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);

  const [club, setClub] = useState<Club | null>(null);
  const [participants, setParticipants] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Player | null>(null);

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

  useEffect(() => {
    fetchClub();
  }, []);

  const handleRemove = (member: Player) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  const goToProfile = (userId: string) => {
    navigation.navigate("UserProfile", { userId });
  };

  const sortOwnerByFirst = (a: Player, b: Player) => {
    const isOwnerA = a.userId === club?.clubOwner?.userId;
    const isOwnerB = b.userId === club?.clubOwner?.userId;
    if (isOwnerA && !isOwnerB) return -1;
    if (!isOwnerA && isOwnerB) return 1;
    return 0;
  };

  const sortedParticipants = [...participants].sort(sortOwnerByFirst);

  const renderItem = ({ item }: { item: Player }) => {
    const isOwner = item.userId === club?.clubOwner?.userId;
    const isAdmin = club?.clubAdmins?.some(
      (admin: CompetitionAdmins) => admin.userId === item.userId,
    );
    const isSelf = item.userId === currentUser?.userId;
    const canRemove =
      currentUser?.userId === club?.clubOwner?.userId && !isOwner && !isSelf;

    return (
      <PlayerRow onPress={() => item.userId && goToProfile(item.userId)}>
        <Player_>
          <Username>{item.username}</Username>
          {isOwner && (
            <>
              <Tag
                name={"Owner"}
                color="rgb(3, 16, 31)"
                iconColor="#FFD700"
                iconSize={15}
                icon={"star-outline"}
                iconPosition={"right"}
                bold
              />
              <Tag
                name={"Admin"}
                color="rgb(3, 16, 31)"
                iconColor="#00A2FF"
                iconSize={15}
                icon={"checkmark-circle-outline"}
                iconPosition={"right"}
                bold
              />
            </>
          )}
          {isAdmin && !isOwner && (
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

        {canRemove && (
          <RemoveButton onPress={() => handleRemove(item)}>
            <ButtonText>Remove</ButtonText>
          </RemoveButton>
        )}
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
      <Title>Remove Members</Title>
      <FlatList
        data={sortedParticipants}
        keyExtractor={(item, index) => item.userId ?? index.toString()}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <Separator />}
      />

      <RemovePlayerModal
        visible={modalVisible}
        playerName={selectedMember?.username}
        entityLabel="club"
        onClose={() => {
          setModalVisible(false);
          setSelectedMember(null);
        }}
        onConfirm={async (reason: string) => {
          await removeClubMember({
            clubId,
            userId: selectedMember?.userId ?? "",
            reason,
          });

          await fetchClub();
          setModalVisible(false);
          setSelectedMember(null);
        }}
      />
    </Container>
  );
};

export default ClubRemoveMembers;

// Styled
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

const Username = styled.Text({
  color: "white",
  fontSize: 16,
});

const RemoveButton = styled.TouchableOpacity({
  backgroundColor: "#e53935",
  paddingVertical: 6,
  paddingHorizontal: 14,
  borderRadius: 6,
  width: 80,
});

const ButtonText = styled.Text({
  color: "white",
  fontSize: 13,
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
