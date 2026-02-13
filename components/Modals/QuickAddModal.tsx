import React, { useState, useContext, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { UserContext } from "../../context/UserContext";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import AddGameModal from "./AddGameModal";
import TournamentFixturesModal from "./TournamentFixturesModal";
import moment from "moment";
import { COMPETITION_TYPES } from "../../schemas/schema";
import { NormalizedCompetition, Tournament } from "../../types/competition";
import CompetitionSelector from "../CompetitionSelector";
import { normalizeCompetitionData } from "../../helpers/normalizeCompetitionData";

const { width: screenWidth } = Dimensions.get("window");

type CompetitionType =
  (typeof COMPETITION_TYPES)[keyof typeof COMPETITION_TYPES];

const TABS = [
  { key: COMPETITION_TYPES.LEAGUE, label: "Leagues" },
  { key: COMPETITION_TYPES.TOURNAMENT, label: "Tournaments" },
] as const;

const QuickAddModal = ({
  modalVisible,
  setModalVisible,
}: QuickAddModalProps) => {
  const { currentUser, getCompetitionsForUser, fetchPlayers } =
    useContext(UserContext);

  const [competitions, setCompetitions] = useState<NormalizedCompetition[]>([]);
  const [selectedCompetition, setSelectedCompetition] =
    useState<NormalizedCompetition | null>(null);
  const [loading, setLoading] = useState(false);
  const [addGameModalVisible, setAddGameModalVisible] = useState(false);
  const [tournamentFixturesModalVisible, setTournamentFixturesModalVisible] =
    useState(false);
  const [activeTab, setActiveTab] = useState<CompetitionType>(
    COMPETITION_TYPES.LEAGUE,
  );

  // Fetch and normalize competitions based on active tab
  useEffect(() => {
    const fetchCompetitions = async () => {
      const userId = currentUser?.userId;
      if (!userId || !modalVisible) return;

      try {
        setLoading(true);

        // Determine collection name based on active tab
        const collectionName =
          activeTab === COMPETITION_TYPES.LEAGUE ? "leagues" : "tournaments";

        // Fetch competitions
        const rawCompetitions = await getCompetitionsForUser(
          userId,
          collectionName,
        );

        // Normalize competitions
        const normalized = rawCompetitions.map((comp: NormalizedCompetition) =>
          normalizeCompetitionData({
            rawData: comp,
            competitionType: activeTab,
          }),
        ) as NormalizedCompetition[];

        setCompetitions(normalized);
      } catch (error) {
        console.error("Error fetching competitions:", error);
        setCompetitions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitions();
  }, [currentUser?.userId, modalVisible, activeTab, getCompetitionsForUser]);

  const closeQuickAddModal = () => {
    setModalVisible(false);
    setSelectedCompetition(null);
  };

  const handleCompetitionSelect = (competition: NormalizedCompetition) => {
    setSelectedCompetition(competition);
  };

  const handleSubmit = () => {
    if (!selectedCompetition) return;

    if (activeTab === COMPETITION_TYPES.LEAGUE) {
      setAddGameModalVisible(true);
      fetchPlayers(selectedCompetition.id);
    } else {
      setTournamentFixturesModalVisible(true);
    }
  };

  const isLeagueTab = activeTab === COMPETITION_TYPES.LEAGUE;
  const noCompetitions = competitions.length === 0;

  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeQuickAddModal}
      >
        <ModalContainer style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <ModalContent>
            <TouchableOpacity
              onPress={closeQuickAddModal}
              style={{
                alignSelf: "flex-end",
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10,
              }}
            >
              <AntDesign name="closecircleo" size={30} color="red" />
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "white",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Select a competition to add a game
            </Text>

            <TabContainer>
              {TABS.map((tab) => (
                <TabItem
                  key={tab.key}
                  isActive={activeTab === tab.key}
                  onPress={() => {
                    setActiveTab(tab.key);
                    setSelectedCompetition(null);
                  }}
                >
                  <TabText isActive={activeTab === tab.key}>
                    {tab.label}
                  </TabText>
                </TabItem>
              ))}
            </TabContainer>

            {noCompetitions ? (
              <Text
                style={{
                  fontSize: 14,
                  color: "#aaa",
                  marginTop: 20,
                  textAlign: "center",
                }}
              >
                {isLeagueTab
                  ? "No active leagues found. Please create or join a league to add a game 🏟️."
                  : "No active tournaments found. Please create or join a tournament to add a game 🏆."}
              </Text>
            ) : (
              <CompetitionSelector
                competitions={competitions}
                selectedId={selectedCompetition?.id}
                onSelectCompetition={handleCompetitionSelect}
                profile={currentUser}
                loading={loading}
              />
            )}

            <SubmitButton
              onPress={handleSubmit}
              disabled={loading || !selectedCompetition || noCompetitions}
              style={{
                backgroundColor:
                  loading || !selectedCompetition ? "#666" : "#00A2FF",
                opacity: loading || !selectedCompetition ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  color: "white",
                }}
              >
                Add Game
              </Text>
            </SubmitButton>
          </ModalContent>
        </ModalContainer>
      </Modal>

      {addGameModalVisible && selectedCompetition && (
        <AddGameModal
          modalVisible={addGameModalVisible}
          setModalVisible={setAddGameModalVisible}
          leagueId={selectedCompetition.id}
          leagueGames={selectedCompetition.games}
          leagueType={selectedCompetition.type}
          leagueName={selectedCompetition.name}
        />
      )}

      {tournamentFixturesModalVisible && selectedCompetition && (
        <TournamentFixturesModal
          modalVisible={tournamentFixturesModalVisible}
          setModalVisible={setTournamentFixturesModalVisible}
          tournament={selectedCompetition}
        />
      )}
    </View>
  );
};

const ModalContainer = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  padding: 20,
  borderRadius: 10,
  width: screenWidth - 40,
  maxHeight: "80%",
  paddingTop: 60,
});

const TabContainer = styled.View({
  flexDirection: "row",
  marginBottom: 15,
  borderBottomWidth: 1,
  borderBottomColor: "rgb(9, 33, 62)",
});

const TabItem = styled.TouchableOpacity<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    flex: 1,
    borderBottomColor: isActive ? "#00A2FF" : "transparent",
    borderBottomWidth: 2,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  }),
);

const TabText = styled.Text<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    fontSize: 14,
    fontWeight: "bold",
    color: isActive ? "#ffffff" : "#aaa",
  }),
);

const SubmitButton = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  marginTop: 20,
  borderRadius: 8,
  // width: screenWidth <= 400 ? 250 : 300,
  backgroundColor: "#00A2FF",
});

interface QuickAddModalProps {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
}

export default QuickAddModal;
