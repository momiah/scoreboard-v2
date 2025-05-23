import React, { useContext } from "react";
import {
  Modal,
  Text,
  Dimensions,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import AntDesign from "@expo/vector-icons/AntDesign";
import { handleSocialPress } from "../../helpers/handleSocialPress";
import { getSplitParagraphs } from "../../helpers/getSplitParagraphs";
import { ICON_MAP } from "../../schemas/schema";
const { width: screenWidth } = Dimensions.get("window");

const WelcomeModal = ({
  visible,
  header,
  body,
  data = {},
  onClose,
  splitAfter = 2,
}) => {
  const splitParagraphs = getSplitParagraphs(body, splitAfter);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ModalContainer>
        <ModalContent>
          <CloseButton onPress={onClose}>
            <AntDesign name="closecircleo" size={30} color="red" />
          </CloseButton>
          <HeaderText>{header}</HeaderText>

          {data?.image && (
            <ImagePreview source={{ uri: data.image }} resizeMode="contain" />
          )}

          <BodyTextContainer>
            {splitParagraphs.map((paragraph, idx) => (
              <BodyText key={idx}>{paragraph}</BodyText>
            ))}
          </BodyTextContainer>

          {data?.footer && (
            <FooterContainer>
              <FooterText>{data.footer}</FooterText>
              <SocialRow>
                {data.buttons?.map((platform) => (
                  <SocialButton
                    key={platform}
                    onPress={() => handleSocialPress(platform)}
                  >
                    <Ionicons
                      name={ICON_MAP[platform]}
                      size={24}
                      color="#00A2FF"
                    />
                  </SocialButton>
                ))}
              </SocialRow>
            </FooterContainer>
          )}
        </ModalContent>
      </ModalContainer>
    </Modal>
  );
};

export default WelcomeModal;

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
  backgroundColor: "rgba(2, 13, 24, 1)",
  padding: 20,
  borderRadius: 10,
  width: screenWidth - 40,
  paddingTop: 40,
});

const HeaderText = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
  marginBottom: 16,
  textAlign: "center",
});

const BodyText = styled.Text({
  color: "#ccc",
  fontSize: 16,
  lineHeight: 20,
  textAlign: "center",
});

const BodyTextContainer = styled.View({
  marginBottom: 10,
  gap: 12,
});

const ImagePreview = styled.Image({
  width: "100%",
  height: 120,
  borderRadius: 8,
  marginBottom: 16,
});

const FooterContainer = styled.View({
  marginTop: 20,
  alignItems: "center",
});

const FooterText = styled.Text({
  color: "#888",
  fontSize: 13,
  marginBottom: 8,
});

const SocialRow = styled.View({
  flexDirection: "row",
  gap: 20,
});

const SocialButton = styled(TouchableOpacity)({
  padding: 6,
});

const CloseButton = styled.TouchableOpacity({
  alignSelf: "flex-end",
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 10,
});
