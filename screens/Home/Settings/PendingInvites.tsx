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
import { getCompetitionTypeAndId } from "@/helpers/getCompetitionConfig";

type PendingInvite = {
  userId: string;
  username: string;
};

const PendingInvites = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const route = useRoute();
  const { leagueId, tournamentId, collectionName } = route.params as {
    leagueId: string;
    tournamentId: string;
    collectionName: string;
  };

  const { competitionId, competitionType } = getCompetitionTypeAndId({
    collectionName,
    leagueId,
    tournamentId,
  });

  const { fetchCompetitionById, getPendingInviteUsers, removePendingInvite } =
    useContext(LeagueContext);

  const [pendingUsers, setPendingUsers] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const competition = await fetchCompetitionById({
        competitionId,
        collectionName,
      });

      const users = await getPendingInviteUsers(competition);
      setPendingUsers(users);
    } catch (error) {
      console.error("Failed to fetch pending invites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleRemove = async (userId: string): Promise<void> => {
    try {
      await removePendingInvite(competitionId, userId, collectionName);
      setPendingUsers((prev) => prev.filter((u) => u.userId !== userId));
      fetchInvites();
    } catch (error) {
      console.error("Failed to remove pending invite:", error);
    }
  };

  const goToProfile = (userId: string) => {
    navigation.navigate("UserProfile", { userId });
  };

  const renderItem = ({ item }: { item: PendingInvite }) => (
    <Row onPress={() => goToProfile(item.userId)}>
      <Username>{item.username}</Username>
      <WithdrawButton onPress={() => handleRemove(item.userId)}>
        <WithdrawText>Withdraw</WithdrawText>
      </WithdrawButton>
    </Row>
  );

  if (loading) {
    return (
      <LoadingWrapper>
        <ActivityIndicator size="large" color="#00A2FF" />
      </LoadingWrapper>
    );
  }

  return (
    <Container>
      <Title>Pending Invites</Title>
      {pendingUsers.length === 0 ? (
        <NoPendingInvites>
          No Pending Invites, please go back to the {competitionType} page to
          invite players to your {competitionType} 📩
        </NoPendingInvites>
      ) : (
        <FlatList
          data={pendingUsers}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
        />
      )}
    </Container>
  );
};

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

const Row = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "rgba(255,255,255,0.05)",
  padding: 12,
  borderRadius: 8,
  marginBottom: 10,
});

const Username = styled.Text({
  color: "white",
  fontSize: 14,
});

const WithdrawButton = styled.TouchableOpacity({
  backgroundColor: "#e53935",
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 6,
});

const WithdrawText = styled.Text({
  color: "white",
  fontWeight: "bold",
  fontSize: 12,
});

const NoPendingInvites = styled.Text({
  color: "#aaa",
  fontSize: 16,
  textAlign: "center",
  marginTop: 40,
  fontStyle: "italic",
});

const LoadingWrapper = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgb(3, 16, 31)",
});

export default PendingInvites;
