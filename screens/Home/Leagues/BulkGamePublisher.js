import React, { useState, useContext, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { UserContext } from "../../../context/UserContext";
import { LeagueContext } from "../../../context/LeagueContext";
import { PopupContext } from "../../../context/PopupContext";
import AddGameModal from "../../../components/Modals/AddGameModal";
import moment from "moment";
import { generateUniqueGameId } from "../../../helpers/generateUniqueId";
import { validateBadmintonScores } from "../../../helpers/validateBadmintonScores";
import { bulkAddApprovedGames } from "../../../devFunctions/bulkAddApprovedGames";
import Popup from "../../../components/popup/Popup";
import {
  TeamColumn,
  ScoreDisplay,
} from "../../../components/scoreboard/ScoreboardAtoms";
import { notificationSchema, notificationTypes } from "../../../schemas/schema";
import { calculateWin } from "../../../helpers/calculateWin";
import { formatDisplayName } from "../../../helpers/formatDisplayName";

const { height: screenHight } = Dimensions.get("window");
const popupHeight = screenHight * 0.3; // 30% of screen height

const BulkGamePublisher = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { leagueId, leagueById } = route.params;
  const {
    currentUser,
    fetchPlayers,
    retrievePlayersFromLeague,
    getUserById,
    sendNotification,
  } = useContext(UserContext);
  const { fetchCompetitionById } = useContext(LeagueContext);
  const {
    handleShowPopup,
    setPopupMessage,
    popupMessage,
    setShowPopup,
    showPopup,
  } = useContext(PopupContext);

  const [pendingGames, setPendingGames] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [expandedGameId, setExpandedGameId] = useState(null);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const leagueType = leagueById?.leagueType || "Doubles";
  const leagueName = leagueById?.leagueName || "";
  const existingGames = leagueById?.games || [];

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");
    navigation.goBack();
  };

  const handleAddGame = useCallback(async () => {
    setLoadingPlayers(true);
    await fetchPlayers(leagueId);
    setLoadingPlayers(false);
    setModalVisible(true);
  }, [fetchPlayers, leagueId]);

  // Handle adding a new game to pending list
  const handleAddGameToPending = useCallback(
    (gameData) => {
      const { selectedPlayers, team1Score, team2Score } = gameData;

      // Updated validation - check for null instead of empty string
      if (
        selectedPlayers.team1.every((player) => player === null) ||
        selectedPlayers.team2.every((player) => player === null)
      ) {
        Alert.alert("Error", "Please select players for both teams.");
        return false;
      }

      if (!team1Score || !team2Score) {
        Alert.alert("Error", "Please enter scores for both teams.");
        return false;
      }

      const score1 = parseInt(team1Score);
      const score2 = parseInt(team2Score);

      const validationError = validateBadmintonScores(score1, score2);
      if (validationError) {
        Alert.alert("Error", validationError);
        return false;
      }

      // Generate unique ID for pending games
      const allGames = [...existingGames, ...pendingGames];
      const gameId = generateUniqueGameId(allGames);

      const team1 = {
        player1: selectedPlayers.team1[0],
        player2: leagueType === "Doubles" ? selectedPlayers.team1[1] : null,
        score: score1,
      };

      const team2 = {
        player1: selectedPlayers.team2[0],
        player2: leagueType === "Doubles" ? selectedPlayers.team2[1] : null,
        score: score2,
      };

      const result = calculateWin(team1, team2, leagueType);

      const newGame = {
        gameId,
        gamescore: `${team1Score} - ${team2Score}`,
        createdAt: new Date(),
        date: moment().format("DD-MM-YYYY"),
        time: moment().format("HH:mm"),
        team1,
        team2,
        result,
        numberOfApprovals: 0,
        numberOfDeclines: 0,
      };

      setPendingGames((prev) => [...prev, newGame]);
      setModalVisible(false);

      return true;
    },
    [currentUser, existingGames, pendingGames, leagueType, handleShowPopup]
  );

  // Handle removing a game from pending list
  const handleRemoveGame = useCallback((gameId) => {
    setPendingGames((prev) => prev.filter((game) => game.gameId !== gameId));
    setExpandedGameId(null);
  }, []);

  // Add function to handle game item press
  const handleGameItemPress = useCallback(
    (gameId) => {
      setExpandedGameId(expandedGameId === gameId ? null : gameId);
    },
    [expandedGameId]
  );

  const sendBulkNotifications = async () => {
    try {
      // 1. Collect all players and count their appearances
      const playerGameCounts = {};

      pendingGames.forEach((game) => {
        // Extract player objects from teams
        const playersInGame = [
          game.team1.player1,
          game.team1.player2,
          game.team2.player1,
          game.team2.player2,
        ].filter(Boolean); // Remove nulls

        playersInGame.forEach((playerObj) => {
          const userId = playerObj.userId;
          const displayName = playerObj.displayName;

          if (!playerGameCounts[userId]) {
            playerGameCounts[userId] = {
              count: 0,
              displayName: displayName,
              userId: userId,
            };
          }
          playerGameCounts[userId].count++;
        });
      });

      // 2. Send notifications to each unique player
      for (const [userId, data] of Object.entries(playerGameCounts)) {
        // Skip current user
        if (userId === currentUser?.userId) {
          continue;
        }

        const userData = await getUserById(userId);
        if (!userData) {
          console.log(`User data not found for ${data.displayName}`);
          continue;
        }

        const payload = {
          ...notificationSchema,
          createdAt: new Date(),
          recipientId: userData.userId,
          senderId: currentUser?.userId,
          message: `An admin has bulk published ${data.count} game${
            data.count > 1 ? "s" : ""
          } with you playing in ${leagueName}`,
          type: notificationTypes.INFORMATION.LEAGUE.TYPE,
          data: {
            leagueId,
          },
        };

        await sendNotification(payload);
        console.log(
          `Notification sent to ${data.displayName} for ${data.count} games`
        );
      }
    } catch (error) {
      console.error("Error sending bulk notifications:", error);
      // Don't fail the whole operation if notifications fail
    }
  };

  // Handle publishing all games
  const handlePublishGames = useCallback(async () => {
    if (pendingGames.length === 0) {
      Alert.alert("No Games", "Please add some games before publishing.");
      return;
    }

    Alert.alert(
      "Confirm Publish",
      `Are you sure you want to publish ${pendingGames.length} game(s)? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Publish",
          style: "destructive",
          onPress: async () => {
            setPublishing(true);
            try {
              const result = await bulkAddApprovedGames(pendingGames, leagueId);

              if (result.success) {
                // Send notifications to players
                await sendBulkNotifications();

                handleShowPopup(
                  `Successfully published ${result.totalSuccessful} games!`
                );
                setPendingGames([]);
                await fetchCompetitionById({ competitionId: leagueId });
              } else {
                Alert.alert(
                  "Error",
                  result.message || "Failed to publish games"
                );
              }
            } catch (error) {
              console.error("Error publishing games:", error);
              Alert.alert(
                "Error",
                "Failed to publish games. Please try again."
              );
            } finally {
              setPublishing(false);
            }
          },
        },
      ]
    );
  }, [
    pendingGames,
    leagueId,
    handleShowPopup,
    fetchCompetitionById,
    navigation,
    sendBulkNotifications,
  ]);

  // Handle cancel - clear all pending games
  const handleCancel = useCallback(() => {
    if (pendingGames.length === 0) {
      navigation.goBack();
      return;
    }

    Alert.alert(
      "Confirm Cancel",
      "Are you sure you want to cancel? All pending games will be lost.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: () => {
            setPendingGames([]);
            navigation.goBack();
          },
        },
      ]
    );
  }, [pendingGames.length, navigation]);

  // Render game item
  const renderGameItem = useCallback(
    ({ item }) => {
      const isExpanded = expandedGameId === item.gameId;

      return (
        <GameContainer
          expanded={isExpanded}
          onPress={() => handleGameItemPress(item.gameId)}
        >
          {isExpanded ? (
            <ActionButtons>
              <CancelButton onPress={() => setExpandedGameId(null)}>
                <ActionButtonText>Cancel</ActionButtonText>
              </CancelButton>
              <DeleteButton onPress={() => handleRemoveGame(item.gameId)}>
                <ActionButtonText>Delete</ActionButtonText>
              </DeleteButton>
            </ActionButtons>
          ) : (
            <>
              <TeamColumn
                team="left"
                players={item.team1}
                leagueType={leagueType}
              />
              <ScoreDisplay
                date={item.date}
                team1={item.team1.score}
                team2={item.team2.score}
                item={item}
              />
              <TeamColumn
                team="right"
                players={item.team2}
                leagueType={leagueType}
              />
            </>
          )}
        </GameContainer>
      );
    },
    [leagueType, expandedGameId, handleGameItemPress, handleRemoveGame]
  );

  const publishText =
    pendingGames.length === 1
      ? "Publish Game"
      : `Publish ${pendingGames.length} Games`;

  return (
    <Container>
      <Popup
        visible={showPopup}
        message={popupMessage}
        onClose={handleClosePopup}
        type="success"
        height={popupHeight}
      />

      <Header>
        <TouchableOpacity onPress={handleCancel}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <HeaderTitle>Bulk Publish Games</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>

      <AddGameButton onPress={handleAddGame} disabled={loadingPlayers}>
        {loadingPlayers ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <ButtonText>Add Game</ButtonText>
        )}
      </AddGameButton>

      {pendingGames.length === 0 ? (
        <EmptyState>
          <Ionicons name="archive-outline" size={60} color="#666" />
          <EmptyText>No games added yet</EmptyText>
          <EmptySubtext>
            Bulk publishing allows admins to publish multiple games without
            approval.
          </EmptySubtext>
        </EmptyState>
      ) : (
        <FlatList
          data={pendingGames}
          renderItem={renderGameItem}
          keyExtractor={(item) => item.gameId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <PublishButtons>
        <CancelButton onPress={handleCancel}>
          <ButtonText>Cancel</ButtonText>
        </CancelButton>

        <PublishButton
          onPress={handlePublishGames}
          disabled={pendingGames.length === 0 || publishing}
          style={{
            backgroundColor:
              pendingGames.length === 0 || publishing ? "#666" : "#00A2FF",
          }}
        >
          {publishing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <ButtonText>{publishText}</ButtonText>
          )}
        </PublishButton>
      </PublishButtons>

      <AddGameModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        leagueId={leagueId}
        leagueGames={[...existingGames, ...pendingGames]}
        leagueType={leagueType}
        leagueName={leagueName}
        onGameAdded={handleAddGameToPending}
        isBulkMode={true}
      />
    </Container>
  );
};

const { width: screenWidth } = Dimensions.get("window");

const Container = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  padding: 20,
});

const Header = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
});

const HeaderTitle = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const ActionButtons = styled.View({
  flexDirection: "row",
  flex: 1,
  gap: 10,
  padding: 20,
  alignItems: "center",
  justifyContent: "center",
  marginVertical: 10,
});

const PublishButtons = styled.View({
  flexDirection: "row",
  gap: 10,
  paddingTop: 20,
});

const CancelButton = styled.TouchableOpacity({
  flex: 1,
  backgroundColor: "#666",
  padding: 12,
  borderRadius: 8,
  alignItems: "center",
});

const DeleteButton = styled.TouchableOpacity({
  flex: 1,
  backgroundColor: "red",
  padding: 12,
  borderRadius: 8,
  alignItems: "center",
});

const ActionButtonText = styled.Text({
  color: "white",
  fontSize: 14,
  fontWeight: "bold",
});

const AddGameButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#00A2FF",
  padding: 15,
  borderRadius: 8,
  marginBottom: 20,
  gap: 8,
});

const EmptyState = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingBottom: 100,
});

const EmptyText = styled.Text({
  color: "#666",
  fontSize: 18,
  fontWeight: "bold",
  marginTop: 15,
});

const EmptySubtext = styled.Text({
  color: "#888",
  fontSize: 14,
  textAlign: "center",
  marginTop: 5,
  paddingHorizontal: 40,
});

const GameContainer = styled.TouchableOpacity(({ expanded }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  backgroundColor: "#001123",
  borderWidth: 1,
  borderColor: expanded ? "rgb(201, 0, 0)" : "rgb(9, 33, 62)",
  borderRadius: 8,
  opacity: expanded ? 0.8 : 1,
  marginBottom: 16,
}));

const PublishButton = styled.TouchableOpacity({
  flex: 2,
  backgroundColor: "#00A2FF",
  padding: 15,
  borderRadius: 8,
  alignItems: "center",
});

const ButtonText = styled.Text({
  color: "white",
  fontSize: 16,
  fontWeight: "bold",
});

export default BulkGamePublisher;
