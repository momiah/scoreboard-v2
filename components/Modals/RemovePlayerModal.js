import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import styled from "styled-components/native";
import ListDropdown from "../ListDropdown/ListDropdown";
import { BlurView } from "expo-blur";

const REASONS = [
  { key: "inactive", value: "Inactive player" },
  { key: "abusive", value: "Abusive or Aggressive behaviour" },
  { key: "distance", value: "Distance" },
  { key: "injured", value: "Injured" },
  { key: "cheating", value: "Cheating" },
  { key: "other", value: "Other" },
];

const RemovePlayerModal = ({ visible, onClose, onConfirm, playerName }) => {
  const [selectedReasonKey, setSelectedReasonKey] = useState("");
  const [description, setDescription] = useState("");

  const reasonValue = REASONS.find((r) => r.key === selectedReasonKey)?.value;

  const isOther = selectedReasonKey === "other";
  const isValid = selectedReasonKey && (!isOther || description.trim());

  const handleRemove = () => {
    const reason = isOther ? `Other: ${description.trim()}` : reasonValue;
    onConfirm(reason);
    setSelectedReasonKey("");
    setDescription("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <ModalContainer>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ModalContent>
            <Title>
              Are you sure you want to remove {playerName} from the league?
            </Title>
            <InfoText>
              They will lose all their league progress but their personal
              progress will remain intact.
            </InfoText>

            <ListDropdown
              label="Select a reason"
              data={REASONS}
              selectedOption={REASONS.find((r) => r.key === selectedReasonKey)}
              setSelected={setSelectedReasonKey}
              placeholder="Choose reason..."
              save="key"
              sliceAmount={REASONS.length}
            />

            {isOther && (
              <DescriptionInput
                placeholder="Enter reason"
                placeholderTextColor="#888"
                multiline
                value={description}
                onChangeText={setDescription}
              />
            )}

            <ButtonRow>
              <CancelButton onPress={onClose}>
                <ButtonText>Cancel</ButtonText>
              </CancelButton>
              <RemoveButton disabled={!isValid} onPress={handleRemove}>
                <ButtonText>Remove</ButtonText>
              </RemoveButton>
            </ButtonRow>
          </ModalContent>
        </KeyboardAvoidingView>
      </ModalContainer>
    </Modal>
  );
};

export default RemovePlayerModal;

const { width: screenWidth } = Dimensions.get("window");

// Styled Components
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
});
const Title = styled.Text({
  color: "white",
  fontSize: 16,
  fontWeight: "bold",
  marginBottom: 10,
});

const InfoText = styled.Text({
  color: "#ccc",
  fontSize: 13,
  marginBottom: 16,
});

const DescriptionInput = styled.TextInput({
  minHeight: 60,
  borderWidth: 1,
  borderColor: "#555",
  borderRadius: 8,
  padding: 10,
  color: "white",
  backgroundColor: "rgba(255,255,255,0.1)",
  marginBottom: 10,
});

const ButtonRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 16,
});

const CancelButton = styled.TouchableOpacity({
  flex: 1,
  marginRight: 8,
  backgroundColor: "#444",
  paddingVertical: 10,
  borderRadius: 8,
  alignItems: "center",
});

const RemoveButton = styled.TouchableOpacity((props) => ({
  flex: 1,
  marginLeft: 8,
  backgroundColor: props.disabled ? "#666" : "#e53935",
  paddingVertical: 10,
  borderRadius: 8,
  alignItems: "center",
}));

const ButtonText = styled.Text({
  color: "white",
  fontWeight: "bold",
});
