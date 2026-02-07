import {
  Modal,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import styled from "styled-components/native";
import { PlatformBlurView as BlurView } from "../../components/PlatformBlurView";
import { Dimensions } from "react-native";
import { LeagueContext } from "../../context/LeagueContext";
import { useEffect, useState, useContext, useCallback } from "react";
import Tag from "../Tag";
import { AntDesign } from "@expo/vector-icons";
import { UserContext } from "../../context/UserContext";
import { useRef } from "react";
import { copyLocationAddress } from "../../helpers/copyLocationAddress";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { NormalizedCompetition } from "@/types/competition";
import { getCompetitionConfig } from "@/helpers/getCompetitionConfig";
import { normalizeCompetitionData } from "@/helpers/normalizeCompetitionData";

const screenWidth = Dimensions.get("window").width;

type InviteActionModalProps = {
  visible: boolean;
  onClose: () => void;
  inviteId: string;
  inviteType: "invite-league" | "invite-tournament";
  notificationId: string;
  isRead: boolean;
};

const InviteActionModal = ({
  visible,
  onClose,
  inviteId,
  inviteType,
  notificationId,
  isRead,
}: InviteActionModalProps) => {
  const {
    fetchCompetitionById,
    acceptCompetitionInvite,
    declineCompetitionInvite,
  } = useContext(LeagueContext);
  const { currentUser, readNotification } = useContext(UserContext);
  const [competition, setCompetition] = useState<NormalizedCompetition | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isWithdrawn, setIsWithdrawn] = useState(false);

  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const timeoutRef = useRef(null);

  const config = getCompetitionConfig(inviteType);
  const navRoute = config.navRoute;

  const navigateTo = (competitionId: string) => {
    navigation.navigate(navRoute, { [config.paramKey]: competitionId });
  };

  const leagueFull =
    (competition?.participants?.length ?? 0) >=
    (competition?.maxPlayers ?? Infinity);

  const alreadyInLeague = competition?.participants?.some(
    (p) => p.userId === currentUser?.userId
  );

  const location = competition?.location;

  const resetState = useCallback(() => {
    setCompetition(null);
    setIsCopied(false);
    setIsWithdrawn(false);
    setLoading(true);
  }, []);

  useEffect(() => {
    if (!visible) {
      resetState();
      return;
    }
    setLoading(true);
    const fetchDetails = async () => {
      try {
        const competition = await fetchCompetitionById({
          competitionId: inviteId,
          collectionName: config.collectionName,
        });

        if (!competition) {
          console.log("Competition not found for invite ID:", inviteId);
          readNotification(notificationId, currentUser.userId);
          setIsWithdrawn(true);
          setLoading(false);
          return;
        }
        const normalizedCompetition = normalizeCompetitionData({
          rawData: competition,
          competitionType: config.competitionType,
        }) as NormalizedCompetition;

        setCompetition(normalizedCompetition);

        const withdrawn = !normalizedCompetition?.pendingInvites?.some(
          (u) => u.userId === currentUser?.userId
        );
        setIsWithdrawn(withdrawn);
      } catch (error) {
        console.error("Error fetching league details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
    setLoading(false);
  }, [visible, inviteId, inviteType]);

  useEffect(() => {
    if (!visible || !competition || isRead) return;

    if (leagueFull || isWithdrawn) {
      readNotification(notificationId, currentUser.userId);
    }
  }, [
    visible,
    competition,
    isRead,
    leagueFull,
    isWithdrawn,
    notificationId,
    currentUser?.userId,
  ]);

  const handleAcceptInvite = async () => {
    if (!competition) {
      console.log("Competition not found");
      return;
    }
    if (competition.participants.length >= competition.maxPlayers) {
      console.log("League is full");
      Alert.alert(
        "League Full",
        "This invite has expired as the league is full."
      );
      return;
    }
    try {
      await acceptCompetitionInvite({
        userId: currentUser?.userId,
        competitionId: competition.id,
        notificationId,
        collectionName: config.collectionName,
      });

      console.log("Invite accepted successfully");
      onClose();
    } catch (error) {
      console.error("Error accepting invite:", error);
    }
  };

  const handleLinkPress = () => {
    if (competition) {
      onClose();
      navigateTo(competition.id);
    }
  };

  const handleDeclineInvite = async () => {
    try {
      await declineCompetitionInvite({
        userId: currentUser?.userId,
        competitionId: competition?.id,
        notificationId,
        collectionName: config.collectionName,
      });
      console.log("Invite declined successfully");
      onClose();
    } catch (error) {
      console.error("Error declining invite:", error);
    }
  };

  const numberOfPlayers = `${competition?.participants.length} / ${competition?.maxPlayers}`;

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

              <LeagueDetailsContainer>
                <Title>League Invite</Title>

                {competition ? (
                  <>
                    <Message>
                      You’ve been invited to join{" "}
                      <LinkText onPress={handleLinkPress}>
                        {competition?.name}
                      </LinkText>
                    </Message>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 15,
                      }}
                    >
                      <LeagueLocation>
                        {competition?.location.courtName},{" "}
                        {competition?.location.city},{" "}
                        {competition?.location.postCode}
                      </LeagueLocation>
                      <TouchableOpacity
                        onPress={() =>
                          copyLocationAddress(location, timeoutRef, setIsCopied)
                        }
                        style={{ marginLeft: 5 }}
                      >
                        <Ionicons
                          // name={"checkmark-circle-outline"}
                          name={
                            isCopied
                              ? "checkmark-circle-outline"
                              : "copy-outline"
                          }
                          size={16}
                          color={isCopied ? "green" : "white"}
                        />
                      </TouchableOpacity>
                    </View>

                    <View
                      style={{
                        flexDirection: "column",
                        alignItems: "flex-start",
                        marginTop: 10,
                        gap: 5,
                      }}
                    >
                      <Tag
                        name={`Start Date - ${competition?.startDate}`}
                        color="rgba(0, 0, 0, 0.7)"
                        iconColor="rgb(0, 133, 40)"
                        iconSize={15}
                        icon="calendar-outline"
                        iconPosition="left"
                        bold
                      />
                      <Tag
                        name={`End Date - ${competition?.endDate}`}
                        color="rgba(0, 0, 0, 0.7)"
                        iconColor="rgb(190, 0, 0)"
                        iconSize={15}
                        icon="calendar-outline"
                        iconPosition="left"
                        bold
                      />
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        gap: 5,
                        marginTop: 20,
                      }}
                    >
                      <Tag
                        name={numberOfPlayers}
                        color="rgba(0, 0, 0, 0.7)"
                        iconColor="#00A2FF"
                        iconSize={15}
                        icon="person"
                        iconPosition="right"
                        bold
                      />
                      <Tag name={competition?.type} />
                      <Tag name={competition?.prizeType} />
                    </View>
                  </>
                ) : null}
              </LeagueDetailsContainer>

              {(leagueFull || isWithdrawn || (alreadyInLeague && !isRead)) && (
                <ErrorText>
                  {leagueFull
                    ? "This invite has expired as the league is full"
                    : isWithdrawn
                    ? "This invite is no longer available"
                    : "You are already a participant in this league"}
                </ErrorText>
              )}

              <View style={{ flexDirection: "row", gap: 15, marginTop: 10 }}>
                <Button
                  style={{ backgroundColor: "red" }}
                  onPress={handleDeclineInvite}
                  disabled={
                    isRead || leagueFull || isWithdrawn || alreadyInLeague
                  }
                >
                  <CloseButtonText>Decline</CloseButtonText>
                </Button>
                <Button
                  onPress={handleAcceptInvite}
                  disabled={
                    isRead || leagueFull || isWithdrawn || alreadyInLeague
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

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)", // Translucent dark blue
  padding: 20,
  borderRadius: 10,
  width: screenWidth - 40,
  alignItems: "flex-start",
  minHeight: 300,
  justifyContent: "center",
});

const Title = styled.Text({
  fontSize: 20,
  fontWeight: "bold",
  color: "white",
  marginBottom: 10,
});

const Message = styled.Text({
  fontSize: 14,
  color: "white",
  marginBottom: 8,
  //   textAlign: "center",
});

const LeagueLocation = styled.Text({
  fontSize: 14,
  //   padding: 5,
  color: "white",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderRadius: 5,
});

const LeagueDetailsContainer = styled.View({
  paddingTop: 20,
  paddingBottom: 25,
  width: "100%",
  borderRadius: 10,
  overflow: "hidden",
});

const CloseButtonText = styled.Text({
  color: "white",
  fontWeight: "bold",
});

interface ButtonProps {
  disabled?: boolean;
}

const Button = styled.TouchableOpacity<ButtonProps>({
  backgroundColor: (props: ButtonProps) =>
    props.disabled ? "#888" : "#00A2FF",
  paddingHorizontal: 20,
  paddingVertical: 8,
  borderRadius: 8,
  marginTop: 10,
  opacity: (props: ButtonProps) => (props.disabled ? 0.6 : 1),
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

const ErrorText = styled.Text({
  color: "red",
  fontSize: 12,
  marginTop: 10,
  fontWeight: "bold",
  fontStyle: "italic",
});

export default InviteActionModal;
