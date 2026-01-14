import React, { useEffect, useState, useContext } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
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
import { getCompetitionTypeAndId } from "@/helpers/getCompetitionConfig";
import { normalizeCompetitionData } from "../../../helpers/normalizeCompetitionData";
import { ScoreboardProfile } from "@/types/player";
import { NormalizedCompetition } from "@/types/competition";

const RemovePlayers = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute();

  const { leagueId, tournamentId, collectionName } = route.params as {
    leagueId: string;
    tournamentId: string;
    collectionName: string;
  };

  const { fetchCompetitionById, removePlayerFromLeague } =
    useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);

  const [competition, setCompetition] = useState<NormalizedCompetition | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlayer, setSelectedPlayer] =
    useState<ScoreboardProfile | null>(null);

  const { competitionId, competitionType } = getCompetitionTypeAndId({
    collectionName,
    leagueId,
    tournamentId,
  });

  const fetchCompetition = async () => {
    setLoading(true);
    try {
      const fetchedLeague = await fetchCompetitionById({
        competitionId: competitionId,
        collectionName,
      });

      const normalizedCompetitionData = normalizeCompetitionData({
        rawData: fetchedLeague,
        competitionType,
      }) as NormalizedCompetition;

      setCompetition(normalizedCompetitionData);
    } catch (error) {
      console.error("Failed to fetch competition:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCompetition();
  }, []);

  const handleRemove = (player: ScoreboardProfile) => {
    setSelectedPlayer(player);
    setModalVisible(true);
  };

  const goToProfile = (userId: string) => {
    navigation.navigate("UserProfile", { userId });
  };

  const sortOwnerByFirst = (a: ScoreboardProfile, b: ScoreboardProfile) => {
    const isOwnerA = a.userId === competition?.owner?.userId;
    const isOwnerB = b.userId === competition?.owner?.userId;
    if (isOwnerA && !isOwnerB) return -1;
    if (!isOwnerA && isOwnerB) return 1;
    return 0;
  };
  const sortedParticipants = competition?.participants.sort(sortOwnerByFirst);

  const renderItem = ({ item }: { item: ScoreboardProfile }) => {
    const isOwner = item.userId === competition?.owner?.userId;
    const isAdmin = competition?.admins?.some(
      (admin) => admin.userId === item.userId
    );
    const isSelf = item.userId === currentUser?.userId;
    const canRemove =
      currentUser?.userId === competition?.owner?.userId && !isOwner && !isSelf;

    return (
      <PlayerRow onPress={() => item.userId && goToProfile(item.userId)}>
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

  if (loading || !competition) {
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
        keyExtractor={(item, index) => item.userId ?? index.toString()}
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
        onConfirm={async (reason: string) => {
          await removePlayerFromLeague(
            competitionId,
            selectedPlayer?.userId,
            reason
          );
          const updated = await fetchCompetitionById({
            competitionId,
            collectionName,
          });
          setCompetition(updated);
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
