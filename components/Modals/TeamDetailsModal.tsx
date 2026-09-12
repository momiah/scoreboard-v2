import React, { useCallback, useContext, useState } from "react";
import { View, Modal, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  useNavigation,
  useFocusEffect,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";

import { TEAM_STATUS } from "@shared";
import type { Ladder, TeamStats, TeamMember } from "@shared/types";
import { LadderContext } from "../../context/LadderContext";
import MatchMedals from "../performance/MatchMedals";
import AnimateNumber from "../performance/AnimateNumber";
import ResultLog from "../performance/ResultLog";
import MedalProgress from "../performance/MedalProgress";

interface TeamDetailsModalProps {
  // Modal mode (Leagues / Tournaments / tapping a team in standings)
  showTeamDetails?: boolean;
  setShowTeamDetails?: (value: boolean) => void;
  teamStats?: TeamStats;
  // Screen mode (Ladder team home / standings) — injected by React Navigation
  route?: { params?: { teamId?: string; team?: TeamStats; ladder?: Ladder } };
}

const memberName = (member: TeamMember): string =>
  member.displayName ||
  [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
  member.username;

const StatsBlock: React.FC<{ team: TeamStats }> = ({ team }) => {
  const winRatio =
    team.numberOfLosses > 0
      ? team.numberOfWins / team.numberOfLosses
      : team.numberOfWins;

  const statData = [
    {
      statTitle: "Wins",
      stat: <AnimateNumber number={team.numberOfWins} fontSize={25} />,
    },
    {
      statTitle: "Losses",
      stat: <AnimateNumber number={team.numberOfLosses} fontSize={25} />,
    },
    {
      statTitle: "Win Ratio",
      stat: <Stat>{winRatio.toFixed(2)}</Stat>,
    },
    {
      statTitle: "Avg Point Difference",
      stat: (
        <AnimateNumber
          number={Number(team.averagePointDifference.toFixed(0))}
          fontSize={25}
        />
      ),
    },
    {
      statTitle: "Current Streak",
      stat: <AnimateNumber number={team.currentStreak} fontSize={25} />,
    },
    {
      statTitle: "Highest Streak",
      stat: <AnimateNumber number={team.highestWinStreak} fontSize={25} />,
    },
  ];

  return (
    <>
      <ResultLog resultLog={team.resultLog} />
      <MatchMedals
        demonWin={team.demonWin}
        winStreak3={team.winStreak3}
        winStreak5={team.winStreak5}
        winStreak7={team.winStreak7}
      />
      <TeamStat>
        {statData.map((data, index) => (
          <TableCell key={index}>
            <StatTitle>{data.statTitle}</StatTitle>
            {data.stat}
          </TableCell>
        ))}
      </TeamStat>
    </>
  );
};

const TeamDetailsModal: React.FC<TeamDetailsModalProps> = ({
  showTeamDetails,
  setShowTeamDetails,
  teamStats,
  route,
}) => {
  const isModal = showTeamDetails !== undefined;
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { fetchTeam } = useContext(LadderContext);

  const teamId = route?.params?.teamId;
  const passedTeam = route?.params?.team ?? null;
  const ladder = route?.params?.ladder;

  const [fetchedTeam, setFetchedTeam] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(!isModal && !passedTeam);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      setFetchedTeam(await fetchTeam(teamId));
    } catch (error) {
      console.error("[TeamDetails] Failed to load team:", error);
      setFetchedTeam(null);
    } finally {
      setLoading(false);
    }
  }, [teamId, fetchTeam]);

  useFocusEffect(
    useCallback(() => {
      if (!isModal && !passedTeam && teamId) load();
    }, [isModal, passedTeam, teamId, load]),
  );

  // ── Modal mode: the read-only stats popup (Leagues / Tournaments) ──
  if (isModal) {
    if (!teamStats) return null;
    return (
      <View>
        <Modal
          animationType="slide"
          transparent={true}
          visible={showTeamDetails}
        >
          <ModalContainer>
            <ModalContent>
              <CloseIconContainer>
                <AntDesign
                  onPress={() => setShowTeamDetails?.(false)}
                  name="close-circle"
                  size={26}
                  color="red"
                />
              </CloseIconContainer>

              <TeamDetail>
                <View>
                  <StatTitle>Team</StatTitle>
                  <PlayerName>{teamStats.team?.[0]}</PlayerName>
                  <PlayerName>{teamStats.team?.[1]}</PlayerName>
                </View>

                <RivalContainer>
                  {teamStats.rival?.rivalPlayers ? (
                    <>
                      <StatTitle>Rival</StatTitle>
                      <PlayerName>{teamStats.rival.rivalPlayers[0]}</PlayerName>
                      <PlayerName>{teamStats.rival.rivalPlayers[1]}</PlayerName>
                    </>
                  ) : null}
                </RivalContainer>
              </TeamDetail>
              <Divider />
              <StatsBlock team={teamStats} />
            </ModalContent>
          </ModalContainer>
        </Modal>
      </View>
    );
  }

  // ── Screen mode: the Ladder team home (identity + members + invite + stats) ──
  const team = passedTeam ?? fetchedTeam;
  const members = team?.players ?? [];
  const isActive = team?.status === TEAM_STATUS.ACTIVE;
  const hasPartner = members.length >= 2;
  const partner = members.find((m) => m.userId !== team?.createdBy);

  const effectiveTeamId = teamId ?? team?.teamId;
  const handleInvite = () => {
    if (!effectiveTeamId) return;
    navigation.navigate("InvitePlayer", {
      team: true,
      teamId: effectiveTeamId,
      ladder,
    });
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
                <MemberRow
                  key={member.userId}
                  activeOpacity={0.85}
                  onPress={() =>
                    member.userId &&
                    navigation.navigate("UserProfile", {
                      userId: member.userId,
                    })
                  }
                  testID={`team-member-${member.userId}`}
                >
                  <MemberIcon>
                    <Ionicons name="person" size={18} color="#00A2FF" />
                  </MemberIcon>
                  <MemberNameText numberOfLines={1}>
                    {memberName(member)}
                  </MemberNameText>
                  {isOwner && (
                    <OwnerTag>
                      <OwnerTagText>Owner</OwnerTagText>
                    </OwnerTag>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#4A5A6A" />
                </MemberRow>
              );
            })}

            {!hasPartner && (
              <InviteRow
                onPress={handleInvite}
                activeOpacity={0.85}
                testID="team-details-invite"
              >
                <MemberIcon>
                  <Ionicons name="person-add" size={18} color="#00A2FF" />
                </MemberIcon>
                <MemberNameText numberOfLines={1}>
                  Invite Partner
                </MemberNameText>
                <Ionicons name="add" size={20} color="#00A2FF" />
              </InviteRow>
            )}
          </MemberList>

          {hasPartner && !isActive && (
            <Hint>
              {partner ? memberName(partner) : "Your partner"} needs to accept
              the invite before this team can join a ladder.
            </Hint>
          )}

          <SectionLabel style={{ marginTop: 24 }}>Team stats</SectionLabel>
          <MedalProgress
            xp={team.XP ?? 0}
            prevGameXp={team.prevGameXP}
            showMedals={false}
          />
          <StatsBlock team={team} />
        </Body>
      )}
    </Screen>
  );
};

export default TeamDetailsModal;

// ── Modal-mode styles (unchanged) ──
const Divider = styled.View({
  borderBottomColor: "#262626",
  borderBottomWidth: 1,
});

const ModalContainer = styled(BlurView).attrs({
  intensity: 80,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 0.7)",
  margin: 10,
  padding: 20,
  paddingLeft: 25,
  paddingRight: 25,
  borderRadius: 20,
});

const CloseIconContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "flex-end",
  padding: 5,
  marginBottom: 20,
});

const PlayerName = styled.Text({
  fontSize: 25,
  color: "white",
  fontWeight: "bold",
});

const TeamStat = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
});

const TeamDetail = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottomColor: "#262626",
  borderBottomWidth: 1,
  paddingBottom: 30,
});

const RivalContainer = styled.View({
  flexDirection: "column",
  alignItems: "flex-end",
});

const TableCell = styled.View({
  width: "50%",
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 20,
  paddingBottom: 20,
  borderTopWidth: 1,
  borderColor: "#262626",
});

const StatTitle = styled.Text({
  fontSize: 14,
  color: "#aaa",
});

const Stat = styled.Text({
  fontSize: 25,
  fontWeight: "bold",
  color: "white",
});

// ── Screen-mode styles (Ladder team home) ──
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

const MemberRow = styled.TouchableOpacity({
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

const InviteRow = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  paddingVertical: 14,
  paddingHorizontal: 14,
  borderRadius: 12,
  backgroundColor: "#0a1f33",
  borderWidth: 1,
  borderColor: "#00A2FF",
  borderStyle: "dashed",
});

const MemberIcon = styled.View({
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: "rgba(0, 162, 255, 0.1)",
  justifyContent: "center",
  alignItems: "center",
});

const MemberNameText = styled.Text({
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

