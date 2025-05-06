import { Modal, Text, TouchableOpacity, View } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { Dimensions } from "react-native";
import { LeagueContext } from "../../context/LeagueContext";
import { useEffect, useState, useContext } from "react";
import Tag from "../Tag";
import { AntDesign } from "@expo/vector-icons";
import { UserContext } from "../../context/UserContext";

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

  useEffect(() => {
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
  }, [inviteId, inviteType]);

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
      // Handle error (e.g., show a message to the user)
    }
  };

  const numberOfPlayers = `${inviteDetails?.leagueParticipants.length} / ${inviteDetails?.maxPlayers}`;

  //   console.log("Current User:", JSON.stringify(currentUser, null, 2));
  //   console.log("Invite Details:", JSON.stringify(inviteDetails, null, 2));

  // Since we are using generic data, we need to start looking at changing the schema from leagueDetails, leagueName, to details, name etc

  return (
    <Modal transparent visible={visible} animationType="slide">
      <ModalContainer>
        <ModalContent>
          <TouchableOpacity
            onPress={() => onClose()}
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
            {/* <LeagueName>{leagueDetails.leagueName}</LeagueName> */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <LeagueLocation>
                {inviteDetails?.location.courtName},{" "}
                {inviteDetails?.location.city},{" "}
                {inviteDetails?.location.postCode}
              </LeagueLocation>
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
                color={"rgba(0, 0, 0, 0.7)"}
                iconColor={"#00A2FF"}
                iconSize={15}
                icon={"person"}
                iconPosition={"right"}
                bold
              />
              <Tag name={inviteDetails?.leagueType} />
              <Tag name={inviteDetails?.prizeType} />
            </View>
          </LeagueDetailsContainer>

          <View
            style={{
              flexDirection: "row",
              gap: 15,
              marginTop: 10,
            }}
          >
            <Button style={{ backgroundColor: "red" }} onPress={onClose}>
              <CloseButtonText>Decline</CloseButtonText>
            </Button>
            <Button onPress={handleAcceptInvite}>
              <AcceptButtonText>Accept</AcceptButtonText>
            </Button>
          </View>
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
});

const Title = styled.Text({
  fontSize: 20,
  fontWeight: "bold",
  color: "white",
  marginBottom: 10,
});

const Message = styled.Text({
  fontSize: 14,
  color: "#ccc",
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
  fontSize: 12,
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
