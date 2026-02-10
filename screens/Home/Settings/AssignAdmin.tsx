import React, { useEffect, useState, useContext } from "react";
import { FlatList, ActivityIndicator, Platform } from "react-native";
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
import { NormalizedCompetition } from "@/types/competition";
import { ScoreboardProfile } from "@/types/player";
import { normalizeCompetitionData } from "../../../helpers/normalizeCompetitionData";
import { getCompetitionTypeAndId } from "@/helpers/getCompetitionConfig";

const platformAdjustedPaddingTop = Platform.OS === "ios" ? undefined : 60; // Adjust for iOS platform

const AssignAdmin = () => {
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

  const { currentUser } = useContext(UserContext);
  const { assignLeagueAdmin, revokeLeagueAdmin, fetchCompetitionById } =
    useContext(LeagueContext);

  const [competition, setCompetition] = useState<NormalizedCompetition | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompetition();
  }, []);

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

  const handleAssign = async (user: ScoreboardProfile) => {
    await assignLeagueAdmin(competitionId, user);
    fetchCompetition();
  };

  const handleRevoke = async (userId: string) => {
    await revokeLeagueAdmin(competitionId, userId);
    fetchCompetition();
  };

  const goToProfile = (userId: string) => {
    navigation.navigate("UserProfile", { userId });
  };

  const isAdmin = (userId: string | undefined) =>
    userId
      ? competition?.admins?.some((admin) => admin.userId === userId)
      : false;

  const renderItem = ({ item }: { item: ScoreboardProfile }) => {
    const isUserAdmin = isAdmin(item.userId);
    const isOwner = item.userId === competition?.owner?.userId;
    const isCurrentUser = item.userId === currentUser?.userId;

    const canAssign = !isUserAdmin && !isCurrentUser && !isOwner;
    const canRevoke =
      isUserAdmin &&
      currentUser?.userId === competition?.owner?.userId &&
      !isOwner;

    return (
      <PlayerRow onPress={() => item.userId && goToProfile(item.userId)}>
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
            <RevokeButton onPress={() => handleRevoke(item.userId!)}>
              <ButtonText>Revoke</ButtonText>
            </RevokeButton>
          )}
        </Action>
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
      <Title>Assign League Admins</Title>
      <FlatList
        data={competition.participants}
        keyExtractor={(item, index) => item.userId ?? index.toString()}
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
