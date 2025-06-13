import React, { useContext, useEffect, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import Tag from "../../components/Tag";

const platformAdjustedPaddingTop = Platform.OS === "ios" ? undefined : 60; // Adjust for iOS platform

const PendingRequests = () => {
  const { currentUser } = useContext(UserContext);
  const { fetchUserPendingRequests, withdrawJoinRequest } =
    useContext(LeagueContext);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const loadRequests = async () => {
    setLoading(true);
    const data = await fetchUserPendingRequests(currentUser?.userId);
    console.log("Pending requests:", data);
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleWithdraw = async (leagueId) => {
    try {
      await withdrawJoinRequest(leagueId, currentUser?.userId);
      loadRequests();
    } catch (err) {
      Alert.alert("Error", "Failed to withdraw request.");
    }
  };

  const renderItem = ({ item }) => (
    <Row>
      <TouchableOpacity
        onPress={() => navigation.navigate("League", { leagueId: item.id })}
        style={{ flex: 1 }}
      >
        <LeagueName>{item.leagueName}</LeagueName>
      </TouchableOpacity>
      <WithdrawButton onPress={() => handleWithdraw(item.id)}>
        <WithdrawText>Withdraw</WithdrawText>
      </WithdrawButton>
    </Row>
  );

  if (loading) {
    return (
      <Center>
        <ActivityIndicator size="large" color="#00A2FF" />
      </Center>
    );
  }

  return (
    <Container>
      <Title>Pending Join Requests</Title>
      {requests.length === 0 ? (
        <EmptyText>
          You have no pending requests. Please check out the leagues page to
          find leagues to join or create your own! 🏆
        </EmptyText>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <Separator />}
        />
      )}
    </Container>
  );
};

export default PendingRequests;

// Styled Components
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

const LeagueName = styled.Text({
  color: "white",
  fontSize: 14,
});

const Row = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "rgba(255,255,255,0.05)",
  padding: 12,
  borderRadius: 8,
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
  color: "#888",
  fontSize: 16,
  textAlign: "center",
  marginTop: 40,
});

const Separator = styled.View({
  height: 10,
});

const Center = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgb(3, 16, 31)",
});
