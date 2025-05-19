import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Clipboard,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { Dimensions } from "react-native";
import { LeagueContext } from "../../context/LeagueContext";
import { useEffect, useState, useContext } from "react";
import Tag from "../Tag";
import { AntDesign } from "@expo/vector-icons";
import { UserContext } from "../../context/UserContext";
import { useRef } from "react";
import moment from "moment";
import { copyLocationAddress } from "../../helpers/copyLocationAddress";
import { useNavigation } from "@react-navigation/native";
import { notificationTypes } from "../../schemas/schema";

const screenWidth = Dimensions.get("window").width;

const GameApprovalModal = ({
  visible,
  onClose,

  notificationId,
  notificationType,
  senderId,
  gameId,
  leagueId,
  playersToUpdate,
  isRead,
  usersToUpdate,
}) => {
  const { fetchLeagueById, approveGame } = useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);
  const [gameDetails, setGameDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leagueDetails, setLeagueDetails] = useState(null);
  const [senderUsername, setSenderUsername] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      const sender = playersToUpdate?.find(
        (player) => player.userId === senderId
      )?.username;
      setSenderUsername(sender);
    };
    fetchDetails();
  }, [playersToUpdate, senderId]);

  const navigation = useNavigation();

  const navigateTo = (route, id) => {
    onClose();
    navigation.navigate(route, id);
  };

  useEffect(() => {
    setLoading(true);
    const fetchDetails = async () => {
      if (notificationType === notificationTypes.ACTION.ADD_GAME.LEAGUE) {
        try {
          const league = await fetchLeagueById(leagueId);
          const game = league.games.find((game) => game.gameId === gameId);
          setLeagueDetails(league);
          setGameDetails(game);
        } catch (error) {
          console.error("Error fetching league details:", error);
        }
      }
    };

    fetchDetails();
    setLoading(false);
  }, [notificationType, gameId, leagueId]);

  const handleApproveGame = async () => {
    try {
      await approveGame(
        gameDetails.gameId,
        leagueDetails.id,
        currentUser.userId,
        senderId,
        notificationId
      );
      onClose(); // Close the modal after accepting
    } catch (error) {
      console.error("Error approving game:", error);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <ModalContainer>
        <ModalContent>
          {/* close button always present */}
          {loading ? (
            <>
              <ActivityIndicator size="large" color="#fff" />
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={onClose}
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

              <Title>Game Approval Request</Title>
              <Message>
                A game has been reported on{" "}
                <LinkText
                  onPress={() =>
                    navigateTo("League", { leagueId: leagueDetails.id })
                  }
                >
                  {leagueDetails?.leagueName}
                </LinkText>
              </Message>

              <Message>
                Reporter:{" "}
                <LinkText
                  onPress={() =>
                    navigateTo("UserProfile", { userId: senderId })
                  }
                >
                  {senderUsername}
                </LinkText>
              </Message>

              <GameContainer>
                <TeamColumn
                  team="left"
                  players={gameDetails?.team1}
                  leagueType={leagueDetails?.leagueType}
                />
                <ScoreDisplay
                  date={gameDetails?.date}
                  team1={gameDetails?.team1.score}
                  team2={gameDetails?.team2.score}
                />
                <TeamColumn
                  team="right"
                  players={gameDetails?.team2}
                  leagueType={leagueDetails?.leagueType}
                />
              </GameContainer>

              <View style={{ flexDirection: "row", gap: 15, marginTop: 10 }}>
                <Button
                  style={{ backgroundColor: "red" }}
                  disabled={isRead}
                  //   onPress={handleDeclineInvite}
                >
                  <CloseButtonText>Decline</CloseButtonText>
                </Button>
                <Button onPress={handleApproveGame} disabled={isRead}>
                  <AcceptButtonText>Accept</AcceptButtonText>
                </Button>
              </View>
            </>
          )}
        </ModalContent>
      </ModalContainer>
    </Modal>
  );
};

const TeamColumn = ({ team, players = {}, leagueType }) => (
  <TeamContainer>
    <PlayerCell position={team} player={players?.player1} />
    {leagueType === "Doubles" && (
      <PlayerCell position={team} player={players?.player2} />
    )}
  </TeamContainer>
);

const PlayerCell = ({ position, player }) => (
  <TeamTextContainer position={position}>
    <TeamText position={position}>{player}</TeamText>
  </TeamTextContainer>
);

// Updated ScoreDisplay component for better alignment
const ScoreDisplay = ({ date, team1, team2 }) => (
  <ResultsContainer>
    <DateText>{date}</DateText>
    <ScoreContainer>
      <ScoreNumber>{team1}</ScoreNumber>
      <ScoreSeparator>-</ScoreSeparator>
      <ScoreNumber>{team2}</ScoreNumber>
    </ScoreContainer>
  </ResultsContainer>
);
const ModalContainer = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const Title = styled.Text({
  fontSize: 20,
  fontWeight: "bold",
  color: "white",
  marginBottom: 10,
  marginTop: 20,
});

const Message = styled.Text({
  fontSize: 14,
  color: "white",
  //   marginBottom: 20,
  marginTop: 10,
  //   textAlign: "center",
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)", // Translucent dark blue
  padding: 20,
  borderRadius: 10,
  width: screenWidth - 40,
  alignItems: "flex-start",
  minHeight: 300,
  justifyContent: "center",
});

const CloseButtonText = styled.Text({
  color: "white",
  fontWeight: "bold",
});
const Button = styled.TouchableOpacity({
  backgroundColor: (props) => (props.disabled ? "#888" : "#00A2FF"),
  paddingHorizontal: 20,
  paddingVertical: 8,
  borderRadius: 8,
  marginTop: 10,
  opacity: (props) => (props.disabled ? 0.6 : 1),
});

const AcceptButtonText = styled.Text({
  color: "white",
  fontWeight: "bold",
});

const LinkText = styled.Text({
  color: "#00A2FF",
  textDecorationLine: "underline",
  fontWeight: "bold",
});

// Adjusted GameContainer to ensure equal spacing
const GameContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16,
  backgroundColor: "#001123",
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  marginTop: 20,
  borderRadius: 8,
  width: "100%",
  paddingVertical: 10, // Added vertical padding for better spacing
});

// Enhanced ResultsContainer for better centering
const ResultsContainer = styled.View({
  flex: 1, // Changed from flexGrow to flex
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 5, // Reduced padding for better balance
});

// Improved score display components
const ScoreNumber = styled.Text({
  fontSize: 24, // Larger font size for better visibility
  fontWeight: "bold",
  color: "#00A2FF",
});

const ScoreSeparator = styled.Text({
  fontSize: 24,
  fontWeight: "bold",
  color: "#ccc",
  marginHorizontal: 8, // More spacing around the separator
});

// Perfectly centered score container
const ScoreContainer = styled.View({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  marginTop: 5,
  paddingHorizontal: 5,
});

const TeamContainer = styled.View({
  flex: 1.5, // Increased relative flex size for team containers
  justifyContent: "center",
  flexDirection: "column",
  borderRadius: 8,
});

// Adjusted width to accommodate up to 10 capital letter usernames
const TeamTextContainer = styled.View({
  flexDirection: "column",
  padding: 15,
  // paddingHorizontal: 10, // Reduced horizontal padding to give more space for text
  paddingRight: 10,
  paddingLeft: 10,
  width: "100%", // Use full width of parent TeamContainer
  maxWidth: screenWidth <= 400 ? 125 : 140, // Increased max width
});

// Added text wrapping capability
const TeamText = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 13 : 14,
  textAlign: (props) => (props.position === "right" ? "right" : "left"),
  flexWrap: "wrap", // Ensures text fits properly and doesn't overflow
});

const DateText = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
  color: "white",
  marginBottom: 5,
});

export default GameApprovalModal;
