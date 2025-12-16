import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  StyleSheet,
} from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { LeagueContext } from "../../../context/LeagueContext";
import { UserContext } from "../../../context/UserContext";
import GenerateFixturesModal from "../../Modals/GenerateFixturesModal";

const Fixtures = ({ tournament }) => {
  const [showGenerateFixturesModal, setShowGenerateFixturesModal] =
    useState(false);

  // Context (for future use when implementing fixture logic)
  const { currentUser } = useContext(UserContext);

  const numberOfParticipants = tournament?.participants
    ? tournament.participants.length
    : 0;

  // const isEvenNumberOfParticipants = false;
  const isEvenNumberOfParticipants = numberOfParticipants % 2 === 0;

  const handleShowGenerateFixtures = () => {
    if (!isEvenNumberOfParticipants) {
      alert("Please ensure an even number of participants.");
      return;
    }
    setShowGenerateFixturesModal(true);
  };

  return (
    <Container>
      <Header>
        <Title>Fixtures</Title>
        <Subtitle>Tournament fixtures will appear here once generated</Subtitle>
      </Header>

      <Content>
        <EmptyStateContainer>
          <EmptyStateIcon>
            <AntDesign name="calendar" size={64} color="#ccc" />
          </EmptyStateIcon>

          <EmptyStateText>No fixtures generated yet</EmptyStateText>
          <EmptyStateSubtext>
            Create your tournament fixtures to start organizing matches
          </EmptyStateSubtext>

          <GenerateButton onPress={handleShowGenerateFixtures}>
            <AntDesign
              name="plus"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <GenerateButtonText>Generate Fixtures</GenerateButtonText>
          </GenerateButton>
        </EmptyStateContainer>
      </Content>

      {showGenerateFixturesModal && (
        <GenerateFixturesModal
          modalVisible={showGenerateFixturesModal}
          setModalVisible={setShowGenerateFixturesModal}
          competition={tournament}
        />
      )}
    </Container>
  );
};

const Container = styled(SafeAreaView)({
  flex: 1,
  backgroundColor: "#020D18",
});

const Header = styled.View({
  padding: "20px 20px 10px 20px",
  borderBottomWidth: 1,
  borderBottomColor: "rgba(255, 255, 255, 0.1)",
});

const Title = styled.Text({
  fontSize: 24,
  fontWeight: "bold",
  color: "#fff",
  marginBottom: 4,
});

const Subtitle = styled.Text({
  fontSize: 14,
  color: "#ccc",
});

const Content = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
});

const EmptyStateContainer = styled.View({
  alignItems: "center",
  maxWidth: 300,
});

const EmptyStateIcon = styled.View({
  marginBottom: 20,
  opacity: 0.6,
});

const EmptyStateText = styled.Text({
  fontSize: 18,
  fontWeight: "600",
  color: "#fff",
  textAlign: "center",
  marginBottom: 8,
});

const EmptyStateSubtext = styled.Text({
  fontSize: 14,
  color: "#ccc",
  textAlign: "center",
  marginBottom: 32,
  lineHeight: 20,
});

const GenerateButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#00A2FF",
  paddingHorizontal: 24,
  paddingVertical: 14,
  borderRadius: 8,
  shadowColor: "#00A2FF",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 5,
});

const GenerateButtonText = styled.Text({
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
});

export default Fixtures;
