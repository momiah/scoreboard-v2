import { Modal, TouchableOpacity, View, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import styled from "styled-components/native";
import { BlurView } from "expo-blur";
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
import { CollectionName, NormalizedCompetition } from "@shared/types";
import type { Club } from "@shared/types";
import { notificationTypes, COLLECTION_NAMES } from "@shared";
import { getCompetitionConfig } from "@/helpers/getCompetitionConfig";
import { normalizeCompetitionData } from "@/helpers/normalizeCompetitionData";

const screenWidth = Dimensions.get("window").width;

type InviteActionModalProps = {
  visible: boolean;
  onClose: () => void;
  inviteId: string;
  inviteType: "invite-league" | "invite-tournament" | "invite-club";
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
    subscribeToCompetition,
    acceptCompetitionInvite,
    declineCompetitionInvite,
    acceptClubInvite,
    declineClubInvite,
  } = useContext(LeagueContext);
  const { currentUser, readNotification } = useContext(UserContext);
  const [competition, setCompetition] = useState<NormalizedCompetition | null>(
    null,
  );
  const [clubData, setClubData] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isWithdrawn, setIsWithdrawn] = useState(false);
  const [withdrawnMessage, setWithdrawnMessage] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const timeoutRef = useRef(null);

  const isClub = inviteType === notificationTypes.ACTION.INVITE.CLUB;
  const config = !isClub ? getCompetitionConfig(inviteType) : null;

  const navigateTo = (id: string) => {
    if (isClub) {
      navigation.navigate("Club", { clubId: id });
    } else if (config) {
      navigation.navigate(config.navRoute, { [config.paramKey]: id });
    }
  };

  const leagueFull =
    !isClub &&
    (competition?.participants?.length ?? 0) >=
    (competition?.maxPlayers ?? Infinity);

  const alreadyInLeague =
    !isClub &&
    competition?.participants?.some(
      (participant) => participant.userId === currentUser?.userId,
    );

  const location = competition?.location;

  const resetState = useCallback(() => {
    setCompetition(null);
    setClubData(null);
    setIsCopied(false);
    setIsWithdrawn(false);
    setWithdrawnMessage("");
    setAccepting(false);
    setDeclining(false);
    setLoading(true);
  }, []);

  useEffect(() => {
    if (!visible) {
      resetState();
      return;
    }

    setLoading(true);

    const collectionName = isClub
      ? COLLECTION_NAMES.clubs
      : config!.collectionName;

    const unsubscribe = subscribeToCompetition(
      inviteId,
      collectionName as CollectionName,
      (data) => {
        if (!data) {
          readNotification(notificationId, currentUser.userId);
          setIsWithdrawn(true);
          setWithdrawnMessage("This competition no longer exists.");
          setLoading(false);
          return;
        }

        if (isClub) {
          const club = { clubId: inviteId, ...data } as unknown as Club;
          setClubData(club);
          const withdrawn = !club.pendingInvites?.some(
            (u) => u.userId === currentUser?.userId,
          );
          setIsWithdrawn(withdrawn);
          if (withdrawn) {
            setWithdrawnMessage("This club invite is no longer available.");
          } else {
            setWithdrawnMessage("");
          }
          setLoading(false);
        } else {
          const normalized = normalizeCompetitionData({
            rawData: data,
            competitionType: config!.competitionType,
          }) as NormalizedCompetition;

          setCompetition(normalized);

          const notInPendingInvites = !normalized.pendingInvites?.some(
            (pendingUser) => pendingUser.userId === currentUser?.userId,
          );
          const alreadyParticipant = normalized.participants?.some(
            (participant) => participant.userId === currentUser?.userId,
          );

          const inviteWithdrawn = notInPendingInvites && !alreadyParticipant;

          if (inviteWithdrawn) {
            setWithdrawnMessage("This invite has been withdrawn.");
          } else if (notInPendingInvites && alreadyParticipant) {
            setWithdrawnMessage("You are already a participant.");
          } else {
            setWithdrawnMessage("");
          }

          setIsWithdrawn(inviteWithdrawn);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error subscribing:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [visible, inviteId]);

  useEffect(() => {
    if (!visible || isRead) return;
    const hasData = isClub ? !!clubData : !!competition;
    if (!hasData) return;

    if (isClub) {
      if (isWithdrawn) readNotification(notificationId, currentUser.userId);
    } else {
      if (leagueFull || isWithdrawn || alreadyInLeague) {
        readNotification(notificationId, currentUser.userId);
      }
    }
  }, [
    visible,
    competition,
    clubData,
    isRead,
    leagueFull,
    isWithdrawn,
    alreadyInLeague,
    notificationId,
    currentUser?.userId,
  ]);

  const handleAcceptInvite = async () => {
    setAccepting(true);
    try {
      if (isClub) {
        await acceptClubInvite({
          userId: currentUser?.userId,
          clubId: inviteId,
          notificationId,
        });
        onClose();
        navigateTo(inviteId);
      } else {
        if (!competition) return;
        await acceptCompetitionInvite({
          userId: currentUser?.userId,
          competitionId: competition.id ?? inviteId,
          notificationId,
          collectionName: config!.collectionName as CollectionName,
        });
        onClose();
      }
    } catch (error) {
      console.error("Error accepting invite:", error);
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineInvite = async () => {
    setDeclining(true);
    try {
      if (isClub) {
        await declineClubInvite({
          userId: currentUser?.userId,
          clubId: inviteId,
          notificationId,
        });
      } else {
        await declineCompetitionInvite({
          userId: currentUser?.userId,
          competitionId: competition?.id ?? inviteId,
          notificationId,
          collectionName: config!.collectionName as CollectionName,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error declining invite:", error);
    } finally {
      setDeclining(false);
    }
  };

  const competitionType = config?.navRoute ?? "Competition";
  const actionBlocked = isWithdrawn || alreadyInLeague || leagueFull || isRead;
  const handleLinkPress = () => {
    const id = isClub ? clubData?.clubId : competition?.id;
    if (id) {
      onClose();
      navigateTo(id);
    }
  };

  const isBusy = accepting || declining;
  const isDisabled =
    isBusy ||
    (isClub
      ? isRead || isWithdrawn
      : isRead || leagueFull || isWithdrawn || alreadyInLeague);

  const numberOfPlayers = !isClub
    ? `${competition?.participants?.length ?? 0} / ${competition?.maxPlayers}`
    : null;

  const title = isClub ? "Club Invite" : "League Invite";

  return (
    <Modal transparent visible={visible} animationType="slide">
      <ModalContainer>
        <ModalContent>
          {loading ? (
            <ActivityIndicator size="large" color="#fff" />
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
                <AntDesign name="close-circle" size={30} color="red" />
              </TouchableOpacity>

              <LeagueDetailsContainer>
                <Title>{competitionType} Invite</Title>

                {isClub && clubData ? (
                  <>
                    <Message>
                      You&apos;ve been invited to join{" "}
                      <LinkText onPress={handleLinkPress}>
                        {clubData.clubName}
                      </LinkText>
                    </Message>

                    {clubData.clubLocation ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 15,
                        }}
                      >
                        <LeagueLocation>{clubData.clubLocation}</LeagueLocation>
                      </View>
                    ) : null}

                    {clubData.clubDescription ? (
                      <Message style={{ marginTop: 10, color: "#ccc" }}>
                        {clubData.clubDescription}
                      </Message>
                    ) : null}

                    <View style={{ flexDirection: "row", gap: 5, marginTop: 15 }}>
                      <Tag name="Club" color="#FAB234" />
                      {clubData.clubOwner?.username ? (
                        <Tag
                          name={`By ${clubData.clubOwner.username}`}
                          color="rgba(0,0,0,0.5)"
                        />
                      ) : null}
                    </View>
                  </>
                ) : competition ? (
                  <>
                    <Message>
                      You&apos;ve been invited to join{" "}
                      <LinkText onPress={handleLinkPress}>
                        {competition.name}
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
                        {competition.location?.courtName},{" "}
                        {competition.location?.city},{" "}
                        {competition.location?.postCode}
                      </LeagueLocation>
                      <TouchableOpacity
                        onPress={() =>
                          copyLocationAddress(location, timeoutRef, setIsCopied)
                        }
                        style={{ marginLeft: 5 }}
                      >
                        <Ionicons
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
                        name={`Start Date - ${competition.startDate}`}
                        color="rgba(0, 0, 0, 0.7)"
                        iconColor="rgb(0, 133, 40)"
                        iconSize={15}
                        icon="calendar-outline"
                        iconPosition="left"
                        bold
                      />
                      <Tag
                        name={`End Date - ${competition.endDate}`}
                        color="rgba(0, 0, 0, 0.7)"
                        iconColor="rgb(190, 0, 0)"
                        iconSize={15}
                        icon="calendar-outline"
                        iconPosition="left"
                        bold
                      />
                    </View>

                    <View
                      style={{ flexDirection: "row", gap: 5, marginTop: 20 }}
                    >
                      <Tag
                        name={numberOfPlayers!}
                        color="rgba(0, 0, 0, 0.7)"
                        iconColor="#00A2FF"
                        iconSize={15}
                        icon="person"
                        iconPosition="right"
                        bold
                      />
                      <Tag name={competition.type} />
                      <Tag name={competition.prizeType} />
                    </View>
                  </>
                ) : null}

                {withdrawnMessage ? (
                  <ErrorText>{withdrawnMessage}</ErrorText>
                ) : leagueFull ? (
                  <ErrorText>
                    This invite has expired as the league is full
                  </ErrorText>
                ) : null}

                <View style={{ flexDirection: "row", gap: 15, marginTop: 10 }}>
                  <Button
                    style={{ backgroundColor: "red" }}
                    onPress={handleDeclineInvite}
                    disabled={isDisabled}
                  >
                    <CloseButtonText>Decline</CloseButtonText>
                    {declining && (
                      <ActivityIndicator
                        size="small"
                        color="#fff"
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </Button>
                  <Button onPress={handleAcceptInvite} disabled={isDisabled}>
                    <AcceptButtonText>Accept</AcceptButtonText>
                    {accepting && (
                      <ActivityIndicator
                        size="small"
                        color="#fff"
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </Button>
                </View>
              </LeagueDetailsContainer>
            </>
          )}
        </ModalContent>
      </ModalContainer>
    </Modal>
  );
};

// ── Layout
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
  alignItems: "flex-start",
  minHeight: 300,
  justifyContent: "center",
});

const LeagueDetailsContainer = styled.View({
  paddingTop: 20,
  paddingBottom: 25,
  width: "100%",
  borderRadius: 10,
  overflow: "hidden",
});

// ── Text
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
});

const LeagueLocation = styled.Text({
  fontSize: 14,
  color: "white",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderRadius: 5,
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

// ── Buttons
const CloseButtonText = styled.Text({
  color: "white",
  fontWeight: "bold",
});

interface ButtonProps {
  disabled?: boolean;
}

const Button = styled.TouchableOpacity<ButtonProps>({
  flexDirection: "row",
  alignItems: "center",
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

export default InviteActionModal;
