import React, { useState, useEffect, useContext } from "react";
import {
  Modal,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { COMPETITION_TYPES } from "@/schemas/schema";
import { normalizeCompetitionData } from "@/helpers/normalizeCompetitionData";
import { NormalizedCompetition, League, Tournament } from "@/types/competition";
import { UserProfile, ScoreboardProfile } from "@/types/player";
import { UserContext } from "@/context/UserContext";
import { formatDisplayName } from "@/helpers/formatDisplayName";

type Props = {
  visible: boolean;
  onClose: () => void;
  onAddPlayers: (players: UserProfile[]) => void;
  currentUserId: string;
  alreadySelected: UserProfile[];
};

type CompetitionWithType = {
  data: NormalizedCompetition;
  competitionType:
    | typeof COMPETITION_TYPES.LEAGUE
    | typeof COMPETITION_TYPES.TOURNAMENT;
};

const RecentPlayersModal = ({
  visible,
  onClose,
  onAddPlayers,
  currentUserId,
  alreadySelected,
}: Props) => {
  const [competitions, setCompetitions] = useState<CompetitionWithType[]>([]);
  const [selectedCompetition, setSelectedCompetition] =
    useState<CompetitionWithType | null>(null);
  const [checkedPlayers, setCheckedPlayers] = useState<
    Record<string, UserProfile>
  >({});
  const [loading, setLoading] = useState(true);
  const { getLeaguesForUser, getTournamentsForUser } = useContext(UserContext);

  useEffect(() => {
    if (!visible) return;

    const preChecked = Object.fromEntries(
      alreadySelected.map((u) => [u.userId, u]),
    );
    setCheckedPlayers(preChecked);
    setSelectedCompetition(null);
    fetchUserCompetitions();
  }, [visible]);

  const fetchUserCompetitions = async () => {
    setLoading(true);
    try {
      const [leagues, tournaments] = await Promise.all([
        getLeaguesForUser(currentUserId),
        getTournamentsForUser(currentUserId),
      ]);

      const normalizedLeagues = leagues.map((league: League) => ({
        data: normalizeCompetitionData({
          rawData: league,
          competitionType: COMPETITION_TYPES.LEAGUE,
        }) as NormalizedCompetition,
        competitionType:
          COMPETITION_TYPES.LEAGUE as typeof COMPETITION_TYPES.LEAGUE,
      }));

      const normalizedTournaments = tournaments.map(
        (tournament: Tournament) => ({
          data: normalizeCompetitionData({
            rawData: tournament,
            competitionType: COMPETITION_TYPES.TOURNAMENT,
          }) as NormalizedCompetition,
          competitionType:
            COMPETITION_TYPES.TOURNAMENT as typeof COMPETITION_TYPES.TOURNAMENT,
        }),
      );

      setCompetitions([...normalizedLeagues, ...normalizedTournaments]);
    } catch (error) {
      console.error("Error fetching competitions:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = (player: ScoreboardProfile) => {
    const userId = player.userId!;
    setCheckedPlayers((prev) => {
      if (prev[userId]) {
        const next = { ...prev };
        delete next[userId];
        return next;
      }
      // Cast ScoreboardProfile to UserProfile shape for invite flow
      return { ...prev, [userId]: player as unknown as UserProfile };
    });
  };

  const handleAddPlayers = () => {
    onAddPlayers(Object.values(checkedPlayers));
    onClose();
  };

  const checkedCount = Object.keys(checkedPlayers).length;

  const renderCompetitionCarousel = () => (
    <View>
      <SectionLabel>Your Competitions</SectionLabel>
      {loading ? (
        <ActivityIndicator color="#00A2FF" style={{ marginVertical: 20 }} />
      ) : competitions.length === 0 ? (
        <EmptyText>No competitions found</EmptyText>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4, gap: 10 }}
        >
          {[...competitions]
            .sort((a, b) => {
              const dateA =
                (a.data.createdAt as { seconds?: number } | undefined)
                  ?.seconds ?? 0;
              const dateB =
                (b.data.createdAt as { seconds?: number } | undefined)
                  ?.seconds ?? 0;
              return dateB - dateA;
            })
            .map((comp) => {
              const isSelected = selectedCompetition?.data.id === comp.data.id;
              return (
                <CompetitionCard
                  key={comp.data.id}
                  onPress={() => setSelectedCompetition(comp)}
                  isSelected={isSelected}
                >
                  <CompetitionCardName numberOfLines={2}>
                    {comp.data.name}
                  </CompetitionCardName>
                  <CompetitionCardType style={{ color: "yellow", fontSize: 9 }}>
                    {comp.data.createdAt &&
                    typeof comp.data.createdAt === "object" &&
                    "seconds" in comp.data.createdAt
                      ? new Date(
                          (comp.data.createdAt as { seconds: number }).seconds *
                            1000,
                        ).toLocaleDateString()
                      : comp.data.createdAt instanceof Date
                        ? comp.data.createdAt.toLocaleDateString()
                        : "no date"}
                  </CompetitionCardType>
                  <CompetitionCardType>
                    {comp.competitionType} · {comp.data.type}
                  </CompetitionCardType>
                </CompetitionCard>
              );
            })}
        </ScrollView>
      )}
    </View>
  );

  const renderPlayerList = () => {
    if (!selectedCompetition) {
      return (
        <EmptyText style={{ marginTop: 20 }}>
          Select a competition to view players
        </EmptyText>
      );
    }

    const players = selectedCompetition.data.participants.filter(
      (p) => p.userId !== currentUserId,
    );
    if (players.length === 0) {
      return <EmptyText style={{ marginTop: 20 }}>No players to add</EmptyText>;
    }

    const allSelected = players.every((p) => !!checkedPlayers[p.userId!]);

    const toggleAll = () => {
      setCheckedPlayers(
        allSelected
          ? {}
          : Object.fromEntries(
              players.map((p) => [p.userId!, p as unknown as UserProfile]),
            ),
      );
    };

    return (
      <View style={{ marginTop: 16, flex: 1 }}>
        <SectionLabel>
          {selectedCompetition.data.name} · {players.length} players
        </SectionLabel>
        <PlayerRow onPress={toggleAll}>
          <PlayerName style={{ color: "#aaa" }}>Select All</PlayerName>
          <Checkbox checked={allSelected}>
            {allSelected && <AntDesign name="check" size={12} color="white" />}
          </Checkbox>
        </PlayerRow>
        <View style={{ flex: 1 }}>
          <FlatList
            data={players}
            keyExtractor={(item) => item.userId!}
            renderItem={({ item }) => {
              const isChecked = !!checkedPlayers[item.userId!];
              return (
                <PlayerRow onPress={() => togglePlayer(item)}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      flex: 1,
                    }}
                  >
                    <PlayerName>{formatDisplayName(item)}</PlayerName>
                    <PlayerName style={{ color: "#aaa", fontStyle: "italic" }}>
                      @ {item.username}
                    </PlayerName>
                  </View>
                  <Checkbox checked={isChecked}>
                    {isChecked && (
                      <AntDesign name="check" size={12} color="white" />
                    )}
                  </Checkbox>
                </PlayerRow>
              );
            }}
          />
        </View>
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <ModalOverlay>
        <GradientOverlay colors={["#191b37", "#001d2e"]}>
          <ModalContent>
            <ContentArea>
              <TouchableOpacity
                onPress={onClose}
                style={{ alignSelf: "flex-end", marginBottom: 12 }}
              >
                <AntDesign name="closecircleo" size={28} color="red" />
              </TouchableOpacity>
              <ModalTitle>Recent Players</ModalTitle>
              {renderCompetitionCarousel()}
              {renderPlayerList()}
            </ContentArea>

            <AddButton
              onPress={handleAddPlayers}
              disabled={checkedCount === 0}
              style={{ opacity: checkedCount === 0 ? 0.5 : 1 }}
            >
              <AddButtonText>Add to selection ({checkedCount})</AddButtonText>
            </AddButton>
          </ModalContent>
        </GradientOverlay>
      </ModalOverlay>
    </Modal>
  );
};

const ModalOverlay = styled(BlurView).attrs({
  intensity: 60,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "flex-end",
});

const ContentArea = styled.View({
  flex: 1,
  overflow: "hidden",
});

const GradientOverlay = styled(LinearGradient)({
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 2,
  height: "85%",
  shadowColor: "#00A2FF",
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 20,
  paddingBottom: 36,
  flex: 1,
});

const ModalTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "white",
  marginBottom: 16,
});

const SectionLabel = styled.Text({
  color: "#aaa",
  fontSize: 12,
  marginBottom: 8,
});

const EmptyText = styled.Text({
  color: "#666",
  fontSize: 13,
  fontStyle: "italic",
  textAlign: "center",
});

const CompetitionCard = styled.TouchableOpacity<{ isSelected: boolean }>(
  ({ isSelected }: { isSelected: boolean }) => ({
    backgroundColor: isSelected ? "rgba(0,162,255,0.2)" : "rgb(5, 34, 64)",
    borderWidth: 1,
    borderColor: isSelected ? "#00A2FF" : "transparent",
    borderRadius: 10,
    padding: 12,
    width: 140,
    justifyContent: "space-between",
  }),
);

const CompetitionCardName = styled.Text({
  color: "white",
  fontSize: 13,
  fontWeight: "600",
  marginBottom: 6,
});

const CompetitionCardType = styled.Text({
  color: "#888",
  fontSize: 10,
  textTransform: "uppercase",
});

const PlayerRow = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 10,
  paddingHorizontal: 4,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(255,255,255,0.06)",
  gap: 10,
});

const PlayerName = styled.Text({
  color: "white",
  fontSize: 14,
});

const Checkbox = styled.View<{ checked: boolean }>(
  ({ checked }: { checked: boolean }) => ({
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: checked ? "#00A2FF" : "#555",
    backgroundColor: checked ? "#00A2FF" : "transparent",
    alignItems: "center",
    justifyContent: "center",
  }),
);

const AddButton = styled.TouchableOpacity({
  marginTop: 20,
  backgroundColor: "#00A2FF",
  borderRadius: 8,
  padding: 12,
  alignItems: "center",
});

const AddButtonText = styled.Text({
  color: "white",
  fontWeight: "600",
  fontSize: 14,
});

export default RecentPlayersModal;
