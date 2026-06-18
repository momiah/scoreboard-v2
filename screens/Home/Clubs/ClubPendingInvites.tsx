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
import { COLLECTION_NAMES } from "@shared";
import type { UserProfile } from "@shared/types";

const ClubPendingInvites = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute();
  const { clubId } = route.params as { clubId: string };

  const { fetchClubById, getPendingInviteUsers, removePendingInvite } =
    useContext(LeagueContext);

  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const club = await fetchClubById(clubId);
      if (!club) {
        setPendingUsers([]);
        return;
      }
      const users = await getPendingInviteUsers(club);
      setPendingUsers(users ?? []);
    } catch (error) {
      console.error("Failed to fetch club pending invites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleWithdraw = async (userId: string) => {
    try {
      await removePendingInvite(clubId, userId, COLLECTION_NAMES.clubs);
      setPendingUsers((prev) => prev.filter((u) => u.userId !== userId));
    } catch (error) {
      console.error("Failed to withdraw club invite:", error);
    }
  };

  const goToProfile = (userId: string) => {
    navigation.navigate("UserProfile", { userId });
  };

  const renderItem = ({ item }: { item: UserProfile }) => (
    <Row onPress={() => goToProfile(item.userId)}>
      <Username>{item.username}</Username>
      <WithdrawButton onPress={() => handleWithdraw(item.userId)}>
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
        <EmptyText>
          No pending invites. Go back to the club page and use &quot;Invite
          Members&quot; to invite players. 📩
        </EmptyText>
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

export default ClubPendingInvites;

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

const EmptyText = styled.Text({
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
