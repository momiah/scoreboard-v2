import React from "react";
import { Modal, ScrollView } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";

import LadderTermsList from "../ladder/LadderTermsContent";

interface LadderTermsModalProps {
  visible: boolean;
  onClose: () => void;
}

const LadderTermsModal: React.FC<LadderTermsModalProps> = ({
  visible,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <Backdrop>
      <TopBar>
        <BackButton onPress={onClose} testID="ladder-terms-modal-back">
          <Ionicons name="chevron-down" size={26} color="#ffffff" />
        </BackButton>
        <TopBarTitle>Terms &amp; Conditions</TopBarTitle>
        <Spacer />
      </TopBar>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <LadderTermsList />
      </ScrollView>
    </Backdrop>
  </Modal>
);

export default LadderTermsModal;

const Backdrop = styled(BlurView).attrs({ intensity: 80, tint: "dark" })({
  flex: 1,
  backgroundColor: "rgba(0, 21, 43, 0.96)",
});

const TopBar = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 15,
  paddingTop: 50,
  paddingBottom: 15,
});

const BackButton = styled.TouchableOpacity({
  padding: 2,
});

const TopBarTitle = styled.Text({
  color: "#ffffff",
  fontSize: 18,
  fontWeight: "bold",
});

const Spacer = styled.View({
  width: 26,
});
