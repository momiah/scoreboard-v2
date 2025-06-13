import React, { useEffect, useState, useContext } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import styled from "styled-components/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LeagueContext } from "../../../context/LeagueContext";

const platformAdjustedPaddingTop = Platform.OS === "ios" ? undefined : 60; // Adjust for iOS platform

const PendingInvites = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { leagueId } = route.params;

  const { fetchLeagueById, getPendingInviteUsers, removePendingInvite } =
    useContext(LeagueContext);

  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const league = await fetchLeagueById(leagueId);
      const users = await getPendingInviteUsers(league);
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

  const handleRemove = async (userId) => {
    try {
      await removePendingInvite(leagueId, userId);
      setPendingUsers((prev) => prev.filter((u) => u.userId !== userId));
      fetchInvites();
    } catch (error) {
      console.error("Failed to remove pending invite:", error);
    }
  };

  const goToProfile = (userId) => {
    navigation.navigate("UserProfile", { userId });
  };

  const renderItem = ({ item }) => (
    console.log("Rendering item:", JSON.stringify(item, null, 2)),
    (
      <Row onPress={() => goToProfile(item.userId)}>
        <Username>{item.username}</Username>
        <WithdrawButton onPress={() => handleRemove(item.userId)}>
          <WithdrawText>Withdraw</WithdrawText>
        </WithdrawButton>
      </Row>
    )
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
          No Pending Invites, please go back to the league page to invite
          players to your league 📩
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
  paddingTop: platformAdjustedPaddingTop,
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
