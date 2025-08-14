import React, { useState, useContext, useEffect } from "react";
import {
  Modal,
  TextInput,
  Button,
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
import { LinearGradient } from "expo-linear-gradient";
import QuickAddLeagueSelector from "../Leagues/QuickAddLeagueSelector";
import AddGameModal from "./AddGameModal";
import moment from "moment";

const QuickAddModal = ({ modalVisible, setModalVisible }) => {
  const { currentUser, getLeaguesForUser, fetchPlayers } =
    useContext(UserContext);
  const [userLeagues, setUserLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [addGameModalVisible, setAddGameModalVisible] = useState(false);
  const [isLeagueSelecting, setIsLeagueSelecting] = useState(false);

  useEffect(() => {
    const fetchLeagues = async () => {
      const userId = currentUser?.userId;
      if (!userId) return;

      try {
        setLeaguesLoading(true);
        const leagues = await getLeaguesForUser(userId);
        const today = moment();
        const activeLeagues = (leagues || []).filter((l) =>
          moment(l.endDate, "DD-MM-YYYY").isSameOrAfter(today, "day")
        );
        setUserLeagues(activeLeagues);
      } catch (error) {
        console.error("Error fetching leagues:", error);
      } finally {
        setLeaguesLoading(false);
      }
    };

    fetchLeagues();
  }, [currentUser?.userId]);

  const closeQuickAddModal = () => {
    setModalVisible(false);
  };

  const handleOpenAddGameModal = () => {
    if (selectedLeague) {
      setAddGameModalVisible(true);
      fetchPlayers(selectedLeague.id);
    }
  };

  const noLeaguesMessage = userLeagues.length === 0;

  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
        }}
      >
        <ModalContainer style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <GradientOverlay colors={["#191b37", "#001d2e"]}>
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
                }}
              >
                Select a league to add a game
              </Text>

              {noLeaguesMessage ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: "#aaa",
                    marginBottom: 10,
                    textAlign: "center",
                  }}
                >
                  No active leagues found. Please create or join a league to add
                  a game 🏟️.
                </Text>
              ) : (
                <QuickAddLeagueSelector
                  profile={currentUser}
                  selectedLeagueId={selectedLeague?.id}
                  onSelectLeague={setSelectedLeague}
                  userLeagues={userLeagues}
                  onSelectionStateChange={setIsLeagueSelecting}
                />
              )}

              <SubmitButton
                onPress={handleOpenAddGameModal}
                disabled={
                  !selectedLeague ||
                  leaguesLoading ||
                  isLeagueSelecting ||
                  noLeaguesMessage
                }
                style={{
                  backgroundColor:
                    !selectedLeague || isLeagueSelecting ? "#666" : "#00A2FF",
                  opacity: !selectedLeague || isLeagueSelecting ? 0.6 : 1,
                }}
              >
                {leaguesLoading || isLeagueSelecting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: "white",
                    }}
                  >
                    Add Game
                  </Text>
                )}
              </SubmitButton>
            </ModalContent>
          </GradientOverlay>
        </ModalContainer>
      </Modal>

      {addGameModalVisible && selectedLeague && (
        <AddGameModal
          modalVisible={addGameModalVisible}
          setModalVisible={setAddGameModalVisible}
          leagueId={selectedLeague.id}
          leagueGames={selectedLeague.games}
          leagueType={selectedLeague.leagueType}
          leagueName={selectedLeague.leagueName}
        />
      )}
    </View>
  );
};

const { width: screenWidth } = Dimensions.get("window");

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
  alignItems: "center",
  paddingTop: 60,
});

const GradientOverlay = styled(LinearGradient)({
  padding: 2,
  borderRadius: 12,
  opacity: 0.9,
});

const SubmitButton = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  marginTop: 20,
  borderRadius: 8,
  width: screenWidth <= 400 ? 250 : 300,
  backgroundColor: "#00A2FF",
});

const ErrorText = styled.Text({
  color: "red",
  fontSize: 10,
  fontStyle: "italic",
});

export default QuickAddModal;
