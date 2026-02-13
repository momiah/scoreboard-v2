import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, Image } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AddLeagueModal from "./AddLeagueModal";
import AddTournamentModal from "./AddTournamentModal";
import QuickAddModal from "./QuickAddModal";
import { BlurView } from "expo-blur";
import { trophies, medals } from "../../mockImages";

interface AddCompetitionModalProps {
  modalVisible: boolean;
  setModalVisible: (visible: boolean) => void;
}

const AddCompetitionModal: React.FC<AddCompetitionModalProps> = ({
  modalVisible,
  setModalVisible,
}) => {
  const [addLeagueModalVisible, setAddLeagueModalVisible] = useState(false);
  const [addTournamentModalVisible, setAddTournamentModalVisible] =
    useState(false);
  const [quickAddModalVisible, setQuickAddModalVisible] = useState(false);

  const handleOptionPress = (option: "league" | "tournament" | "game") => {
    if (option === "league") {
      setAddLeagueModalVisible(true);
    } else if (option === "tournament") {
      setAddTournamentModalVisible(true);
    } else if (option === "game") {
      setQuickAddModalVisible(true);
    }
  };

  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <ModalOverlay>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>Add Competition</ModalTitle>
              <CloseButton onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="white" />
              </CloseButton>
            </ModalHeader>

            <OptionsContainer>
              <TouchableOpacity
                onPress={() => handleOptionPress("league")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#0a1929",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#1a2b3d",
                  marginBottom: 15,
                }}
              >
                <IconContainer>
                  {/* <Ionicons name="trophy-outline" size={32} color="#00A2FF" /> */}
                  <Image
                    source={trophies[4]}
                    style={{ width: 32, height: 32 }}
                    resizeMode="contain"
                  />
                </IconContainer>
                <OptionContent>
                  <OptionTitle>Add League</OptionTitle>
                  <OptionSubtitle>
                    Add an open league where players report scores till an end
                    date
                  </OptionSubtitle>
                </OptionContent>
                <Ionicons name="chevron-forward" size={24} color="#A9A9A9" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleOptionPress("tournament")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#0a1929",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#1a2b3d",
                  marginBottom: 15,
                }}
              >
                <IconContainer>
                  <Image
                    source={medals[4]}
                    style={{ width: 32, height: 32 }}
                    resizeMode="contain"
                  />
                </IconContainer>
                <OptionContent>
                  <OptionTitle>Add Tournament</OptionTitle>
                  <OptionSubtitle>
                    Add a tournament with pre generated games
                  </OptionSubtitle>
                </OptionContent>
                <Ionicons name="chevron-forward" size={24} color="#A9A9A9" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleOptionPress("game")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#0a1929",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#1a2b3d",
                }}
              >
                <IconContainer>
                  <Ionicons
                    name="add-circle-outline"
                    size={32}
                    color="#00A2FF"
                  />
                </IconContainer>
                <OptionContent>
                  <OptionTitle>Add Game</OptionTitle>
                  <OptionSubtitle>
                    Quickly add a game for an existing league or tournament
                  </OptionSubtitle>
                </OptionContent>
                <Ionicons name="chevron-forward" size={24} color="#A9A9A9" />
              </TouchableOpacity>
            </OptionsContainer>
          </ModalContent>
        </ModalOverlay>
      </Modal>

      {addLeagueModalVisible && (
        <AddLeagueModal
          modalVisible={addLeagueModalVisible}
          setModalVisible={setAddLeagueModalVisible}
        />
      )}

      {addTournamentModalVisible && (
        <AddTournamentModal
          modalVisible={addTournamentModalVisible}
          setModalVisible={setAddTournamentModalVisible}
        />
      )}

      {quickAddModalVisible && (
        <QuickAddModal
          modalVisible={quickAddModalVisible}
          setModalVisible={setQuickAddModalVisible}
        />
      )}
    </View>
  );
};

const ModalOverlay = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "flex-end",
  //   alignItems: "center",
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingBottom: 40,
});

const ModalHeader = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 20,
  borderBottomWidth: 1,
  borderBottomColor: "#1a2b3d",
});

const ModalTitle = styled.Text({
  fontSize: 24,
  fontWeight: "bold",
  color: "white",
});

const CloseButton = styled(TouchableOpacity)({
  padding: 5,
});

const OptionsContainer = styled.View({
  padding: 20,
});

const IconContainer = styled.View({
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: "rgba(0, 162, 255, 0.1)",
  justifyContent: "center",
  alignItems: "center",
  marginRight: 15,
});

const OptionContent = styled.View({
  flex: 1,
});

const OptionTitle = styled.Text({
  fontSize: 18,
  fontWeight: "600",
  color: "white",
  marginBottom: 4,
});

const OptionSubtitle = styled.Text({
  fontSize: 14,
  color: "#A9A9A9",
  lineHeight: 20,
});

export default AddCompetitionModal;
