import React, { useCallback, useContext, useState } from "react";
import { ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  RouteProp,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";

import { TEAM_STATUS } from "@shared";
import type { Ladder, TeamStats, TeamMember } from "@shared/types";
import { LadderContext } from "../../../context/LadderContext";

interface TeamDetailsParams {
  teamId: string;
  ladder?: Ladder;
}

const memberName = (member: TeamMember): string =>
  member.displayName ||
  [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
  member.username;

const TeamDetails: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, TeamDetailsParams>, string>>();
  const { teamId, ladder } = route.params;

  const { fetchTeam } = useContext(LadderContext);

  const [team, setTeam] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTeam(await fetchTeam(teamId));
    } catch (error) {
      console.error("[TeamDetails] Failed to load team:", error);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [teamId, fetchTeam]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const members = team?.players ?? [];
  const isActive = team?.status === TEAM_STATUS.ACTIVE;
  const hasPartner = members.length >= 2;
  const partner = members.find((m) => m.userId !== team?.createdBy);

  const handleInvite = () => {
    navigation.navigate("InvitePlayer", { team: true, teamId, ladder });
  };

  return (
    <Screen>
      <Header>
        <BackButton
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID="team-details-back"
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </BackButton>
        <HeaderTitle numberOfLines={1}>Team</HeaderTitle>
        <HeaderSpacer />
      </Header>

      {loading ? (
        <LoadingWrap>
          <ActivityIndicator size="small" color="#00A2FF" />
        </LoadingWrap>
      ) : !team ? (
        <EmptyText>This team could not be found.</EmptyText>
      ) : (
        <Body
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <TeamHero>
            {team.teamProfilePic ? (
              <HeroAvatar source={{ uri: team.teamProfilePic }} />
            ) : (
              <HeroAvatarPlaceholder>
                <Ionicons name="people" size={34} color="#00A2FF" />
              </HeroAvatarPlaceholder>
            )}
            <TeamName numberOfLines={2}>
              {team.teamName?.trim() || (team.team ?? []).join(" & ")}
            </TeamName>
            <StatusPill isActive={isActive}>
              <Ionicons
                name={isActive ? "checkmark-circle" : "time-outline"}
                size={14}
                color={isActive ? "#22c55e" : "#FAB234"}
              />
              <StatusPillText isActive={isActive}>
                {isActive
                  ? "Active team"
                  : hasPartner
                    ? "Waiting for partner to accept"
                    : "No partner yet"}
              </StatusPillText>
            </StatusPill>
          </TeamHero>

          <SectionLabel>Members</SectionLabel>
          <MemberList>
            {members.map((member) => {
              const isOwner = member.userId === team.createdBy;
              return (
                <MemberRow key={member.userId}>
                  <MemberIcon>
                    <Ionicons name="person" size={18} color="#00A2FF" />
                  </MemberIcon>
                  <MemberName numberOfLines={1}>
                    {memberName(member)}
                  </MemberName>
                  {isOwner && (
                    <OwnerTag>
                      <OwnerTagText>Owner</OwnerTagText>
                    </OwnerTag>
                  )}
                </MemberRow>
              );
            })}
          </MemberList>

          {!hasPartner && (
            <>
              <Hint>Invite a partner to complete your doubles team.</Hint>
              <InviteButton
                onPress={handleInvite}
                activeOpacity={0.85}
                testID="team-details-invite"
              >
                <Ionicons name="person-add" size={18} color="#ffffff" />
                <InviteButtonText>Invite Partner</InviteButtonText>
              </InviteButton>
            </>
          )}

          {hasPartner && !isActive && (
            <Hint>
              {partner ? memberName(partner) : "Your partner"} needs to accept
              the invite before this team can join a ladder.
            </Hint>
          )}
        </Body>
      )}
    </Screen>
  );
};

export default TeamDetails;

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

const LoadingWrap = styled.View({
  paddingVertical: 40,
});

const EmptyText = styled.Text({
  color: "#9fb8c8",
  fontSize: 14,
  textAlign: "center",
  paddingVertical: 32,
});

const TeamHero = styled.View({
  alignItems: "center",
  gap: 10,
  paddingVertical: 20,
});

const HeroAvatar = styled.Image({
  width: 104,
  height: 104,
  borderRadius: 52,
  backgroundColor: "#0a1929",
});

const HeroAvatarPlaceholder = styled.View({
  width: 104,
  height: 104,
  borderRadius: 52,
  backgroundColor: "#0a1929",
  borderWidth: 1,
  borderColor: "#1a2b3d",
  justifyContent: "center",
  alignItems: "center",
});

const TeamName = styled.Text({
  color: "#e2e8f0",
  fontSize: 22,
  fontWeight: "bold",
  textAlign: "center",
});

const StatusPill = styled.View<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: isActive
      ? "rgba(34, 197, 94, 0.12)"
      : "rgba(250, 178, 52, 0.12)",
  }),
);

const StatusPillText = styled.Text<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? "#22c55e" : "#FAB234",
    fontSize: 12,
    fontWeight: "600",
  }),
);

const SectionLabel = styled.Text({
  color: "#7f97a8",
  fontSize: 12,
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginTop: 8,
  marginBottom: 10,
});

const MemberList = styled.View({
  gap: 10,
});

const MemberRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 14,
  paddingHorizontal: 14,
  borderRadius: 12,
  backgroundColor: "#0a1929",
  borderWidth: 1,
  borderColor: "#1a2b3d",
});

const MemberIcon = styled.View({
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: "rgba(0, 162, 255, 0.1)",
  justifyContent: "center",
  alignItems: "center",
});

const MemberName = styled.Text({
  flex: 1,
  color: "#e2e8f0",
  fontSize: 15,
  fontWeight: "500",
});

const OwnerTag = styled.View({
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 10,
  backgroundColor: "rgba(0, 162, 255, 0.15)",
});

const OwnerTagText = styled.Text({
  color: "#00A2FF",
  fontSize: 11,
  fontWeight: "bold",
});

const Hint = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  textAlign: "center",
  marginTop: 20,
  marginBottom: 12,
});

const InviteButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingVertical: 16,
  borderRadius: 12,
  backgroundColor: "#00A2FF",
});

const InviteButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
