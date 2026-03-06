import React, { useContext, useEffect, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import Tag from "../../components/Tag";
import Ionicons from "@expo/vector-icons/Ionicons";

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
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleWithdraw = async (competitionId, collectionName) => {
    try {
      await withdrawJoinRequest(
        competitionId,
        currentUser?.userId,
        collectionName,
      );
      loadRequests();
    } catch (err) {
      Alert.alert("Error", "Failed to withdraw request.");
    }
  };

  const handleNavigate = (item) => {
    if (item.collectionName === "leagues") {
      navigation.navigate("League", { leagueId: item.id });
    } else {
      navigation.navigate("Tournament", { tournamentId: item.id });
    }
  };

  const renderItem = ({ item }) => {
    const isLeague = item.collectionName === "leagues";
    const name = isLeague ? item.leagueName : item.tournamentName;

    return (
      <Row>
        <TouchableOpacity
          onPress={() => handleNavigate(item)}
          style={{ flex: 1 }}
        >
          <LeagueName>{name}</LeagueName>
          <CompetitionType>
            {isLeague ? "League" : "Tournament"}
          </CompetitionType>
        </TouchableOpacity>
        <WithdrawButton
          onPress={() => handleWithdraw(item.id, item.collectionName)}
        >
          <WithdrawText>Withdraw</WithdrawText>
        </WithdrawButton>
      </Row>
    );
  };

  if (loading) {
    return (
      <Center>
        <ActivityIndicator size="large" color="#00A2FF" />
      </Center>
    );
  }

  return (
    <Container>
      <Header>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <HeaderTitle>Pending Join Requests</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>
      {requests.length === 0 ? (
        <EmptyText>
          You have no pending requests. Please check out the leagues or
          tournaments page to find ones to join or create your own! 🏆
        </EmptyText>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => `${item.collectionName}-${item.id}`}
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
});

const CompetitionType = styled.Text({
  color: "#00A2FF",
  fontSize: 11,
  marginTop: 2,
});

const LeagueName = styled.Text({
  color: "white",
  fontSize: 14,
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 30,
  justifyContent: "space-between",
});

const HeaderTitle = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
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
