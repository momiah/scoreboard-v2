import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import styled from "styled-components/native";
import { UserContext } from "../../context/UserContext";
import Popup from "../../components/popup/Popup";
import { PopupContext } from "../../context/PopupContext";

const platformAdjustedPaddingTop = Platform.OS === "ios" ? undefined : 60; // Adjust for iOS platform

const AccountSupport = ({ navigation }) => {
  const { sendSupportRequest, currentUser } = useContext(UserContext);
  const { showPopup, setShowPopup, popupMessage, setPopupMessage } =
    useContext(PopupContext);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) return;

    setLoading(true);
    try {
      await sendSupportRequest({ subject, message, currentUser });
      setPopupMessage(
        "Support Request sent, we'll aim to get back to you within 72 hours"
      );
      setShowPopup(true);
      setSubject("");
      setMessage("");
    } catch (err) {
      console.error("Support request error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          backgroundColor: "rgb(3, 16, 31)",
          flexGrow: 1,
          paddingTop: platformAdjustedPaddingTop,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Header>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <HeaderTitle>Account Support</HeaderTitle>
          <View style={{ width: 24 }} />
        </Header>
        <Label>Subject</Label>
        <Input
          placeholder="Enter subject"
          placeholderTextColor="#999"
          value={subject}
          onChangeText={setSubject}
        />

        <Label>Message</Label>
        <TextArea
          placeholder="Enter your message"
          placeholderTextColor="#999"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
        />

        <SubmitButton
          onPress={handleSubmit}
          disabled={loading || !subject.trim() || !message.trim()}
          style={{
            opacity: loading || !subject.trim() || !message.trim() ? 0.5 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <ButtonText>Submit</ButtonText>
          )}
        </SubmitButton>
      </ScrollView>

      <Popup
        visible={showPopup}
        message={popupMessage}
        onClose={() => setShowPopup(false)}
        type="success"
      />
    </KeyboardAvoidingView>
  );
};

export default AccountSupport;

// Styled Components
const Title = styled.Text({
  fontSize: 20,
  color: "white",
  fontWeight: "bold",
  marginBottom: 20,
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 30,
  justifyContent: "space-between",
});

const HeaderTitle = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const Label = styled.Text({
  color: "#ccc",
  fontSize: 12,
  marginBottom: 6,
});

const Input = styled.TextInput({
  backgroundColor: "#1e2a38",
  color: "white",
  padding: 10,
  borderRadius: 6,
  marginBottom: 20,
});

const TextArea = styled.TextInput({
  backgroundColor: "#1e2a38",
  color: "white",
  padding: 10,
  borderRadius: 6,
  height: 120,
  textAlignVertical: "top",
  marginBottom: 20,
});

const SubmitButton = styled.TouchableOpacity({
  backgroundColor: "#00A2FF",
  padding: 12,
  borderRadius: 6,
  alignItems: "center",
});

const ButtonText = styled.Text({
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
});
