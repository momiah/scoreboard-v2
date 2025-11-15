import React, { useEffect, useState, useContext } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import styled from "styled-components/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LeagueContext } from "../../../context/LeagueContext";
import { UserContext } from "../../../context/UserContext";
import Tag from "../../../components/Tag";
import RemovePlayerModal from "../../../components/Modals/RemovePlayerModal";

const RemovePlayers = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { leagueId, leagueById } = route.params;

  const { fetchCompetitionById, removePlayerFromLeague } =
    useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);

  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    setLeague(leagueById);
    setLoading(false);
  }, []);

  const handleRemove = (player) => {
    setSelectedPlayer(player);
    setModalVisible(true);
  };

  const goToProfile = (userId) => {
    navigation.navigate("UserProfile", { userId });
  };

  const sortOwnerByFirst = (a, b) => {
    const isOwnerA = a.userId === league?.leagueOwner?.userId;
    const isOwnerB = b.userId === league?.leagueOwner?.userId;
    if (isOwnerA && !isOwnerB) return -1;
    if (!isOwnerA && isOwnerB) return 1;
    return 0;
  };
  const sortedParticipants = league?.leagueParticipants.sort(sortOwnerByFirst);

  const renderItem = ({ item }) => {
    const isOwner = item.userId === league?.leagueOwner?.userId;
    const isAdmin = league?.leagueAdmins?.some(
      (admin) => admin.userId === item.userId
    );
    const isSelf = item.userId === currentUser?.userId;
    const canRemove =
      currentUser?.userId === league?.leagueOwner?.userId &&
      !isOwner &&
      !isSelf;

    return (
      <PlayerRow onPress={() => goToProfile(item.userId)}>
        <Player>
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
        </Player>

        {canRemove && (
          <RemoveButton onPress={() => handleRemove(item)}>
            <ButtonText>Remove</ButtonText>
          </RemoveButton>
        )}
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
      <Title>Remove Players</Title>
      <FlatList
        data={sortedParticipants}
        keyExtractor={(item) => item.userId}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <Separator />}
      />

      <RemovePlayerModal
        visible={modalVisible}
        playerName={selectedPlayer?.username}
        onClose={() => {
          setModalVisible(false);
          setSelectedPlayer(null);
        }}
        onConfirm={async (reason) => {
          await removePlayerFromLeague(leagueId, selectedPlayer.userId, reason);
          const updated = await fetchCompetitionById({
            competitionId: leagueId,
          });
          setLeague(updated);
          setModalVisible(false);
          setSelectedPlayer(null);
        }}
      />
    </Container>
  );
};

export default RemovePlayers;

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

const Player = styled.View({
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
