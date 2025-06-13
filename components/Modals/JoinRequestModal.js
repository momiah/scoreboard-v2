import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Clipboard,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback } from "react";

import styled from "styled-components/native";
import { PlatformBlurView as BlurView } from "../../components/PlatformBlurView";
import { Dimensions } from "react-native";
import { LeagueContext } from "../../context/LeagueContext";
import { useEffect, useState, useContext } from "react";

import { AntDesign } from "@expo/vector-icons";
import { UserContext } from "../../context/UserContext";

import { useNavigation } from "@react-navigation/native";
import { GameContext } from "../../context/GameContext";
import CourtChampsLogo from "../../assets/court-champ-logo-icon.png";

import MedalDisplay from "../performance/MedalDisplay";

const screenWidth = Dimensions.get("window").width;
const iconSize = 45;

const JoinRequestModal = ({
  visible,
  onClose,
  requestId,
  requestType,
  notificationId,
  senderId,
  isRead,
}) => {
  const { fetchLeagueById, acceptLeagueJoinRequest, declineLeagueJoinRequest } =
    useContext(LeagueContext);
  const { findRankIndex } = useContext(GameContext);
  const { currentUser, getUserById, readNotification } =
    useContext(UserContext);
  const [senderDetails, setSenderDetails] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation();

  const navigateTo = (leagueId) => {
    navigation.navigate("League", { leagueId });
  };

  const leagueFull =
    requestDetails?.leagueParticipants.length >= requestDetails?.maxPlayers;

  const requestWithdrawn = !requestDetails?.pendingRequests?.some(
    (req) => req.userId === senderId
  );

  useEffect(() => {
    setLoading(true);
    console.log("senderId from prop:", senderId);
    const fetchDetails = async () => {
      if (requestType === "join-league-request") {
        try {
          const league = await fetchLeagueById(requestId);
          const player = await getUserById(senderId);
          if (!league || !player) {
            console.error("League or player not found");
            readNotification(notificationId, currentUser?.userId);
            return;
          }
          setRequestDetails(league);
          setSenderDetails(player);
        } catch (error) {
          console.error("Error fetching league details:", error);
        }
      } // Add else for tournaments in the future
    };

    fetchDetails();
    setLoading(false);
  }, [requestId, requestType, senderId]);

  useEffect(() => {
    // const notificationExistsWithNoDetails = notificationId && !requestDetails;

    if (!requestDetails || isRead) return;

    if (leagueFull || requestWithdrawn) {
      readNotification(notificationId, currentUser?.userId);
    }
  }, [
    requestDetails,
    isRead,
    leagueFull,
    requestWithdrawn,
    notificationId,
    currentUser?.userId,
  ]);

  const handleAcceptJoinRequest = async () => {
    try {
      await acceptLeagueJoinRequest(
        senderId,
        requestDetails.id,
        notificationId,
        currentUser?.userId
      );

      console.log("Invite accepted successfully");
      onClose(); // Close the modal after accepting
    } catch (error) {
      console.error("Error accepting invite:", error);
    }
  };

  const handleLinkPress = () => {
    if (requestDetails) {
      onClose();
      navigateTo(requestDetails.id);
    }
  };

  const navigateToProfile = (senderId) => {
    onClose();
    navigation.navigate("UserProfile", {
      userId: senderId,
    });
  };

  const handleDeclineJoinRequest = async () => {
    try {
      await declineLeagueJoinRequest(
        senderId,
        requestDetails.id,
        notificationId,
        currentUser?.userId
      );
      console.log("Invite declined successfully");
      onClose(); // Close the modal after declining
    } catch (error) {
      console.error("Error declining invite:", error);
    }
  };

  const renderPlayer = useCallback(
    ({ item: player }) => {
      const playerXp = player?.profileDetail.XP;
      const rankLevel = findRankIndex(playerXp) + 1;

      return (
        <PlayerRow
          key={player.userId}
          onPress={() => navigateToProfile(senderId)}
        >
          <Avatar
            source={
              player?.profileImage
                ? { uri: player.profileImage }
                : CourtChampsLogo
            }
          />

          <PlayerNameCell>
            <PlayerName>{player?.username}</PlayerName>
          </PlayerNameCell>
          <TableCell>
            <StatTitle>Wins</StatTitle>
            <Stat>{player?.profileDetail.numberOfWins}</Stat>
          </TableCell>
          <TableCell>
            <MedalDisplay xp={playerXp.toFixed(0)} size={iconSize} />
            <RankLevel>{rankLevel}</RankLevel>
          </TableCell>
        </PlayerRow>
      );
    },
    [findRankIndex]
  );

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

              <Title>Join Request</Title>
              <Message>
                A user has requested to join{" "}
                <LinkText onPress={handleLinkPress}>
                  {requestDetails?.leagueName}
                </LinkText>
              </Message>

              {senderDetails &&
                renderPlayer({
                  item: senderDetails,
                  index: 0,
                })}

              {requestWithdrawn && (
                <LeagueFullText>
                  Request to join league has been withdrawn
                </LeagueFullText>
              )}

              {leagueFull && (
                <LeagueFullText>
                  This invite has expired as the league is full
                </LeagueFullText>
              )}

              <View style={{ flexDirection: "row", gap: 15, marginTop: 10 }}>
                <Button
                  style={{ backgroundColor: "red" }}
                  disabled={isRead || leagueFull || requestWithdrawn}
                  onPress={handleDeclineJoinRequest}
                >
                  <CloseButtonText>Decline</CloseButtonText>
                </Button>
                <Button
                  onPress={handleAcceptJoinRequest}
                  disabled={isRead || leagueFull || requestWithdrawn}
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
  textAlign: "left",
});

const Message = styled.Text({
  fontSize: 14,
  color: "white",
  marginBottom: 8,
  //   textAlign: "center",
});

const LinkText = styled.Text({
  color: "#00A2FF",
  textDecorationLine: "underline",
  fontWeight: "bold",
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

const PlayerRow = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  border: "1px solid rgb(9, 33, 62)",
  marginTop: 10,
  borderRadius: 10,
});

const Avatar = styled.Image({
  width: iconSize,
  height: iconSize,
  borderRadius: 30,
  borderWidth: 2,
  borderColor: "#00A2FF",
  marginBottom: 5,
  marginRight: 10,
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const PlayerNameCell = styled.View({
  paddingTop: 15,
  paddingBottom: 15,
  width: 110,
});

const PlayerName = styled.Text({
  fontSize: 13,
  fontWeight: "bold",
  color: "white",
});

const Rank = styled.Text({
  fontSize: 13,
  color: "#00A2FF",
  fontWeight: "bold",
});

const StatTitle = styled.Text({
  fontSize: 11,
  color: "#aaa",
});

const Stat = styled.Text({
  fontSize: 13,
  fontWeight: "bold",
  color: "white",
});

const RankLevel = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
  color: "white",
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

const LeagueFullText = styled.Text({
  color: "red",
  fontSize: 12,
  marginTop: 10,
  fontWeight: "bold",
  fontStyle: "italic",
});

export default JoinRequestModal;
