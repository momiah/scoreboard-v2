import React, { useCallback, useContext, useState } from "react";
import { ActivityIndicator, Alert } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  StackActions,
  RouteProp,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";

import { TEAM_STATUS } from "@shared";
import type { Ladder, TeamStats } from "@shared/types";
import { UserContext } from "../../../context/UserContext";
import { LadderContext } from "../../../context/LadderContext";
import { PopupContext } from "../../../context/PopupContext";

interface SelectDoublesTeamParams {
  ladder: Ladder;
}

const teamLabel = (team: TeamStats): string =>
  team.teamName?.trim() || (team.team ?? []).join(" & ");

const SelectDoublesTeam: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, SelectDoublesTeamParams>, string>>();
  const { ladder } = route.params;

  const { currentUser } = useContext(UserContext);
  const { fetchUserTeams, joinLadderAsTeam } = useContext(LadderContext);
  const { showBottomToast } = useContext(PopupContext);

  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const loadTeams = useCallback(async () => {
    if (!currentUser?.userId) {
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setTeams(await fetchUserTeams(currentUser.userId));
    } catch (error) {
      console.error("[SelectDoublesTeam] Failed to load teams:", error);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.userId, fetchUserTeams]);

  useFocusEffect(
    useCallback(() => {
      loadTeams();
    }, [loadTeams]),
  );

  const selectedTeam = teams.find((team) => team.teamKey === selectedKey) ?? null;

  const handleJoin = async () => {
    if (!selectedTeam || joining) return;
    if (ladder.entryFee > 0) {
      Alert.alert("Payment", "Paid entry isn't wired up yet.");
      return;
    }
    setJoining(true);
    try {
      const { success, conflict } = await joinLadderAsTeam(
        ladder.ladderId,
        selectedTeam,
      );
      if (success) {
        showBottomToast("Joined the ladder", "success");
        navigation.dispatch(
          StackActions.replace("Ladder", {
            ladderId: ladder.ladderId,
            tab: "Matchmaking",
          }),
        );
      } else if (conflict) {
        showBottomToast(
          "A member of this team is already in the ladder.",
          "error",
        );
      } else {
        showBottomToast("Couldn't join. Please try again.", "error");
      }
    } finally {
      setJoining(false);
    }
  };

  const renderTeam = (item: TeamStats) => {
    const isPending = item.status === TEAM_STATUS.PENDING;
    const isSelected = item.teamKey === selectedKey;
    return (
      <TeamRow
        key={item.teamKey}
        isSelected={isSelected}
        isPending={isPending}
        activeOpacity={isPending ? 1 : 0.85}
        disabled={isPending}
        onPress={() => !isPending && setSelectedKey(item.teamKey)}
        testID={`select-team-${item.teamKey}`}
      >
        <TeamIcon>
          <Ionicons name="people" size={20} color="#00A2FF" />
        </TeamIcon>
        <TeamInfo>
          <TeamName numberOfLines={1}>{teamLabel(item)}</TeamName>
          <TeamMembers numberOfLines={1}>
            {isPending
              ? "Waiting for partner to accept"
              : (item.team ?? []).join(" • ")}
          </TeamMembers>
        </TeamInfo>
        {isPending ? (
          <Ionicons name="time-outline" size={20} color="#FAB234" />
        ) : (
          <Ionicons
            name={isSelected ? "radio-button-on" : "radio-button-off"}
            size={22}
            color={isSelected ? "#00A2FF" : "#4A5A6A"}
          />
        )}
      </TeamRow>
    );
  };

  return (
    <Screen>
      <Header>
        <BackButton
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID="select-team-back"
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </BackButton>
        <HeaderTitle numberOfLines={1}>Select Team</HeaderTitle>
        <HeaderSpacer />
      </Header>

      <Body
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <LadderName numberOfLines={1}>{ladder.name}</LadderName>
        <SubText>
          Pick the team you want to enter into this doubles ladder.
        </SubText>

        {loading ? (
          <LoadingWrap>
            <ActivityIndicator size="small" color="#00A2FF" />
          </LoadingWrap>
        ) : teams.length === 0 ? (
          <EmptyText>
            You don&apos;t have any teams yet. Create one to get started.
          </EmptyText>
        ) : (
          <TeamList>{teams.map(renderTeam)}</TeamList>
        )}

        <CreateLink
          onPress={() => navigation.navigate("CreateTeam", { ladder })}
          activeOpacity={0.85}
          testID="select-team-create"
        >
          <Ionicons name="add" size={18} color="#00A2FF" />
          <CreateLinkText>Create new team</CreateLinkText>
        </CreateLink>
      </Body>

      <Footer>
        <JoinButton
          onPress={handleJoin}
          disabled={!selectedTeam || joining}
          isDisabled={!selectedTeam || joining}
          activeOpacity={0.85}
          testID="select-team-join"
        >
          <JoinButtonText>
            {joining ? "Joining…" : "Join Ladder"}
          </JoinButtonText>
        </JoinButton>
      </Footer>
    </Screen>
  );
};

export default SelectDoublesTeam;

const Screen = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  paddingHorizontal: 20,
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 20,
  paddingBottom: 12,
});

const Body = styled.ScrollView({
  flex: 1,
});

const TeamList = styled.View({
  paddingVertical: 12,
  gap: 10,
});

const Footer = styled.View({
  paddingTop: 12,
  paddingBottom: 28,
});

const BackButton = styled.TouchableOpacity({
  width: 32,
  justifyContent: "center",
});

const HeaderTitle = styled.Text({
  flex: 1,
  textAlign: "center",
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const HeaderSpacer = styled.View({
  width: 32,
});

const LadderName = styled.Text({
  color: "#e2e8f0",
  fontSize: 20,
  fontWeight: "bold",
  marginTop: 8,
});

const SubText = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  marginTop: 6,
  marginBottom: 8,
});

const LoadingWrap = styled.View({
  paddingVertical: 30,
});

const EmptyText = styled.Text({
  color: "#9fb8c8",
  fontSize: 14,
  textAlign: "center",
  paddingVertical: 24,
});

const TeamRow = styled.TouchableOpacity<{
  isSelected: boolean;
  isPending: boolean;
}>(({ isSelected, isPending }: { isSelected: boolean; isPending: boolean }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 14,
  paddingHorizontal: 14,
  borderRadius: 12,
  backgroundColor: "#0a1929",
  borderWidth: 1,
  borderColor: isSelected ? "#00A2FF" : "#1a2b3d",
  opacity: isPending ? 0.55 : 1,
}));

const TeamIcon = styled.View({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "rgba(0, 162, 255, 0.1)",
  justifyContent: "center",
  alignItems: "center",
});

const TeamInfo = styled.View({
  flex: 1,
});

const TeamName = styled.Text({
  color: "#e2e8f0",
  fontSize: 15,
  fontWeight: "600",
});

const TeamMembers = styled.Text({
  color: "#7f97a8",
  fontSize: 12,
  marginTop: 2,
});

const CreateLink = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingVertical: 14,
  marginTop: 16,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#00A2FF",
});

const CreateLinkText = styled.Text({
  color: "#00A2FF",
  fontSize: 15,
  fontWeight: "bold",
});

const JoinButton = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: isDisabled ? "#1e3a52" : "#00A2FF",
    alignItems: "center",
    opacity: isDisabled ? 0.7 : 1,
  }),
);

const JoinButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
