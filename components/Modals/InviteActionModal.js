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

const screenWidth = Dimensions.get("window").width;

const InviteActionModal = ({
  visible,
  onClose,
  inviteId,
  inviteType,
  notificationId,
}) => {
  const { fetchLeagueById } = useContext(LeagueContext);
  const { currentUser, acceptLeagueInvite } = useContext(UserContext);
  const [inviteDetails, setInviteDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const fetchDetails = async () => {
      if (inviteType === "invite-league") {
        try {
          const league = await fetchLeagueById(inviteId);
          setInviteDetails(league);
        } catch (error) {
          console.error("Error fetching league details:", error);
        }
      }
    };

    fetchDetails();
    setLoading(false);
  }, [inviteId, inviteType]);

  const copyAddress = () => {
    if (!inviteDetails?.location) return;
    const address = `${inviteDetails.location.courtName}, ${inviteDetails.location.city}, ${inviteDetails.location.postCode}`;
    Clipboard.setString(address);
    setIsCopied(true);

    // Clear existing timeout and reset after 1.5 seconds
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsCopied(false), 1500);
  };

  const handleAcceptInvite = async () => {
    try {
      await acceptLeagueInvite(
        currentUser.userId,
        inviteDetails.id,
        notificationId
      );

      console.log("Invite accepted successfully");
      onClose(); // Close the modal after accepting
    } catch (error) {
      console.error("Error accepting invite:", error);
    }
  };

  const numberOfPlayers = `${inviteDetails?.leagueParticipants.length} / ${inviteDetails?.maxPlayers}`;

  const startDate = moment(inviteDetails?.startDate).format("ddd Do MMM");
  const endDate = moment(inviteDetails?.endDate).format("ddd Do MMM");

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
                <Message>
                  You’ve been invited to join {inviteDetails?.leagueName}
                </Message>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 15,
                  }}
                >
                  <LeagueLocation>
                    {inviteDetails?.location.courtName},{" "}
                    {inviteDetails?.location.city},{" "}
                    {inviteDetails?.location.postCode}
                  </LeagueLocation>
                  <TouchableOpacity
                    onPress={copyAddress}
                    style={{ marginLeft: 5 }}
                  >
                    <Ionicons
                      name={isCopied ? "check" : "copy-outline"}
                      size={16}
                      color={isCopied ? "#00FF00" : "white"}
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
                    name={`Start Date - ${startDate}`}
                    color="rgba(0, 0, 0, 0.7)"
                    iconColor="rgb(0, 133, 40)"
                    iconSize={15}
                    icon="calendar-outline"
                    iconPosition="left"
                    bold
                  />
                  <Tag
                    name={`End Date - ${endDate}`}
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
                  <Tag name={inviteDetails?.leagueType} />
                  <Tag name={inviteDetails?.prizeType} />
                </View>
              </LeagueDetailsContainer>

              <View style={{ flexDirection: "row", gap: 15, marginTop: 10 }}>
                <Button style={{ backgroundColor: "red" }} onPress={onClose}>
                  <CloseButtonText>Decline</CloseButtonText>
                </Button>
                <Button onPress={handleAcceptInvite}>
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
  alignItems: "center",
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

const LeagueName = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
  padding: 5,
  marginBottom: 5,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderRadius: 5,
  alignSelf: "flex-start",
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

export default InviteActionModal;
