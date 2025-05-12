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
  usersToUpdate,
}) => {
  console.log("gameId", gameId);
  const { fetchLeagueById, acceptLeagueInvite, declineLeagueInvite } =
    useContext(LeagueContext);
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

  const navigateTo = (route, leagueId) => {
    onClose();
    navigation.navigate(route, { leagueId });
  };

  useEffect(() => {
    setLoading(true);
    const fetchDetails = async () => {
      if (notificationType === notificationTypes.ACTION.ADD_GAME.LEAGUE) {
        try {
          const league = await fetchLeagueById(leagueId);
          console.log("league", league);
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

  console.log("leagueId", JSON.stringify(leagueDetails, null, 2));

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
                  onPress={() => navigateTo("League", leagueDetails.id)}
                >
                  {leagueDetails?.leagueName}
                </LinkText>
              </Message>

              <Message>
                Reporter:{" "}
                <LinkText onPress={() => navigateTo("UserProfile", senderId)}>
                  {senderUsername}
                </LinkText>
              </Message>

              <GameContainer>
                <TeamColumn
                  team="left"
                  players={gameDetails?.team1}
                  leagueType={gameDetails?.leagueType}
                />
                <ScoreDisplay
                  date={gameDetails?.date}
                  team1={gameDetails?.team1.score}
                  team2={gameDetails?.team2.score}
                />
                <TeamColumn
                  team="right"
                  players={gameDetails?.team2}
                  leagueType={gameDetails?.leagueType}
                />

                {/* {gameDetails?.approvalStatus === "pending" && (
                  <PendingLabel>Pending Approval</PendingLabel>
                )} */}
              </GameContainer>

              <View style={{ flexDirection: "row", gap: 15, marginTop: 10 }}>
                <Button
                  style={{ backgroundColor: "red" }}
                  //   onPress={handleDeclineInvite}
                >
                  <CloseButtonText>Decline</CloseButtonText>
                </Button>
                <Button
                // onPress={handleAcceptInvite}
                >
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

const ScoreDisplay = ({ date, team1, team2 }) => (
  <ResultsContainer>
    <DateText>{date}</DateText>
    <ScoreContainer>
      <Score>
        {team1} - {team2}
      </Score>
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
  backgroundColor: "#00A2FF",
  paddingHorizontal: 20,
  paddingVertical: 8,
  borderRadius: 8,
  marginTop: 10,
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

const GameContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
  backgroundColor: "#001123",
  border: "1px solid rgb(9, 33, 62)",
  marginTop: 20,
  borderRadius: 8,
});

const ResultsContainer = styled.View({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  paddingBottom: 30,
});

const Score = styled.Text({
  fontSize: 25,
  fontWeight: "bold",
  color: "#00A2FF",
});

const ScoreContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  marginTop: screenWidth <= 400 ? 20 : null,
});

const TeamText = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 13 : 14,
  textAlign: (props) => (props.position === "right" ? "right" : "left"),
});

const TeamContainer = styled.View({
  display: "flex",
  justifyContent: "center",
  flexDirection: "column",
  borderRadius: 8,
});

const TeamTextContainer = styled.View({
  display: "flex",
  flexDirection: "column",
  padding: 15,
  paddingLeft: 20,
  paddingRight: 20,
  width: screenWidth <= 400 ? 115 : 130,
});

const DateText = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
  color: "white",
});

export default GameApprovalModal;
