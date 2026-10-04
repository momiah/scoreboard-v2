import React from "react";
import { Dimensions, Modal, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign, Ionicons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  testID?: string;
}

const InfoModal: React.FC<InfoModalProps> = ({
  visible,
  onClose,
  title,
  description,
  ctaLabel,
  onCtaPress,
  icon = "information-circle-outline",
  testID = "info-modal",
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <Backdrop>
      <Card testID={testID}>
        <Header>
          <Ionicons name={icon} size={28} color="#00A2FF" />
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID={`${testID}-close`}
          >
            <AntDesign name="close-circle" size={24} color="red" />
          </TouchableOpacity>
        </Header>

        <Title>{title}</Title>
        <Description>{description}</Description>

        {ctaLabel && onCtaPress ? (
          <CtaButton
            activeOpacity={0.85}
            onPress={onCtaPress}
            testID={`${testID}-cta`}
          >
            <CtaText>{ctaLabel}</CtaText>
          </CtaButton>
        ) : null}
      </Card>
    </Backdrop>
  </Modal>
);

export default InfoModal;

const Backdrop = styled(BlurView).attrs({ intensity: 80, tint: "dark" })({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const Card = styled.View({
  width: screenWidth - 40,
  borderRadius: 20,
  backgroundColor: "rgba(2, 13, 24, 0.95)",
  padding: 20,
  gap: 12,
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
});

const Title = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "#ffffff",
});

const Description = styled.Text({
  fontSize: 14,
  lineHeight: 20,
  color: "#cccccc",
});

const CtaButton = styled.TouchableOpacity({
  marginTop: 8,
  paddingVertical: 14,
  borderRadius: 12,
  backgroundColor: "#00A2FF",
  alignItems: "center",
});

const CtaText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});
