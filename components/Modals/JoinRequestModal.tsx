import { Modal, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useCallback } from "react";

import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { Dimensions } from "react-native";
import { LeagueContext } from "../../context/LeagueContext";
import { useEffect, useState, useContext } from "react";
import { getCompetitionConfig } from "@/helpers/getCompetitionConfig";
import { normalizeCompetitionData } from "@/helpers/normalizeCompetitionData";
import { UserProfile } from "@/types/player";

import { AntDesign } from "@expo/vector-icons";
import { UserContext } from "../../context/UserContext";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { GameContext } from "../../context/GameContext";
import { ccImageEndpoint } from "@/schemas/schema";
import { NormalizedCompetition } from "@/types/competition";

import MedalDisplay from "../performance/MedalDisplay";

const screenWidth = Dimensions.get("window").width;
const iconSize = 45;

type JoinRequestModalProps = {
  visible: boolean;
  onClose: () => void;
  requestId: string;
  requestType: string;
  notificationId: string;
  senderId: string;
  isRead: boolean;
};

const JoinRequestModal = ({
  visible,
  onClose,
  requestId,
  requestType,
  notificationId,
  senderId,
  isRead,
}: JoinRequestModalProps) => {
  const {
    fetchCompetitionById,
    acceptCompetitionJoinRequest,
    declineCompetitionJoinRequest,
  } = useContext(LeagueContext);
  const { findRankIndex } = useContext(GameContext);
  const { currentUser, getUserById, readNotification } =
    useContext(UserContext);
  const [senderDetails, setSenderDetails] = useState(null);
  const [competition, setCompetition] = useState<NormalizedCompetition | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [joiningCompetition, setJoiningCompetition] = useState(false);

  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const config = getCompetitionConfig(requestType);
  const competitionType = config.competitionType;
  const navRoute = config.navRoute;

  const navigateTo = (competitionId: string) => {
    navigation.navigate(navRoute, { competitionId });
  };

  const competitionFull =
    competition?.participants.length !== undefined &&
    competition?.maxPlayers !== undefined &&
    competition.participants.length >= competition.maxPlayers;

  const requestWithdrawn = !competition?.pendingRequests?.some(
    (req) => req.userId === senderId
  );

  const userAlreadyInCompetition = competition?.participants?.some(
    (participant) => participant.userId === senderId
  );

  useEffect(() => {
    setLoading(true);
    const fetchDetails = async () => {
      try {
        const competition = await fetchCompetitionById({
          competitionId: requestId,
          collectionName: config.collectionName,
        });
        const player = await getUserById(senderId);
        if (!competition || !player) {
          console.error("Competition or player not found");
          readNotification(notificationId, currentUser?.userId);
          return;
        }

        const normalizedCompetition = normalizeCompetitionData({
          rawData: competition,
          competitionType: config.competitionType,
        }) as NormalizedCompetition;

        setCompetition(normalizedCompetition);
        setSenderDetails(player);
      } catch (error) {
        console.error("Error fetching competition details:", error);
      }
    }; // Add else for tournaments in the future

    fetchDetails();
    setLoading(false);
  }, [requestId, requestType]);

  useEffect(() => {
    // const notificationExistsWithNoDetails = notificationId && !competition;

    if (!competition || isRead) return;

    if (competitionFull || requestWithdrawn) {
      readNotification(notificationId, currentUser?.userId);
    }
  }, [
    competition,
    isRead,
    competitionFull,
    requestWithdrawn,
    notificationId,
    currentUser?.userId,
  ]);

  const handleAcceptJoinRequest = async () => {
    try {
      setJoiningCompetition(true);
      await acceptCompetitionJoinRequest({
        senderId,
        competitionId: competition?.id,
        notificationId,
        userId: currentUser?.userId,
        collectionName: config.collectionName,
      });

      console.log("Invite accepted successfully");
      onClose();
    } catch (error) {
      console.error("Error accepting invite:", error);
    } finally {
      setJoiningCompetition(false);
    }
  };

  const handleLinkPress = () => {
    if (competition) {
      onClose();
      navigateTo(competition.id);
    }
  };

  const navigateToProfile = (senderId: string) => {
    onClose();
    navigation.navigate("UserProfile", {
      userId: senderId,
    });
  };

  const handleDeclineJoinRequest = async () => {
    try {
      await declineCompetitionJoinRequest({
        senderId,
        competitionId: competition?.id,
        notificationId,
        userId: currentUser?.userId,
        collectionName: config.collectionName,
      });
      console.log("Join request declined successfully");
      onClose();
    } catch (error) {
      console.error("Error declining join request:", error);
    }
  };

  const renderPlayer = useCallback(
    ({ item: player, senderId }: { item: UserProfile; senderId: string }) => {
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
                : { uri: ccImageEndpoint }
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
    [findRankIndex, navigateToProfile, senderId]
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
                  {competition?.name}
                </LinkText>
              </Message>

              {senderDetails &&
                renderPlayer({
                  item: senderDetails,
                  senderId,
                })}

              {requestWithdrawn && (
                <DisabledText>
                  Request to join {competitionType} has been withdrawn
                </DisabledText>
              )}

              {competitionFull && (
                <DisabledText>
                  This invite has expired as the {competitionType} is full
                </DisabledText>
              )}

              {userAlreadyInCompetition && (
                <DisabledText>
                  This user is already a participant in the {competitionType}
                </DisabledText>
              )}

              <View style={{ flexDirection: "row", gap: 15, marginTop: 10 }}>
                <Button
                  style={{ backgroundColor: "red" }}
                  disabled={
                    isRead ||
                    competitionFull ||
                    requestWithdrawn ||
                    userAlreadyInCompetition ||
                    joiningCompetition
                  }
                  onPress={handleDeclineJoinRequest}
                >
                  <CloseButtonText>Decline</CloseButtonText>
                </Button>
                <Button
                  onPress={handleAcceptJoinRequest}
                  disabled={
                    isRead ||
                    competitionFull ||
                    requestWithdrawn ||
                    userAlreadyInCompetition ||
                    joiningCompetition
                  }
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

interface ButtonProps {
  disabled?: boolean;
}

const Button = styled.TouchableOpacity<ButtonProps>(
  ({ disabled }: ButtonProps) => ({
    backgroundColor: disabled ? "#888" : "#00A2FF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    opacity: disabled ? 0.6 : 1,
  })
);

const AcceptButtonText = styled.Text({
  color: "white",
  fontWeight: "bold",
});

const DisabledText = styled.Text({
  color: "red",
  fontSize: 12,
  marginTop: 10,
  fontWeight: "bold",
  fontStyle: "italic",
});

export default JoinRequestModal;
