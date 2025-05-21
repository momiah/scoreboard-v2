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
import styled from "styled-components/native";
import { UserContext } from "../../context/UserContext";
import Popup from "../../components/popup/Popup";
import { PopupContext } from "../../context/PopupContext";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../services/firebase.config";

const UserFeedback = () => {
  const { currentUser, sendFeedback } = useContext(UserContext);
  const { showPopup, setShowPopup, popupMessage, setPopupMessage } =
    useContext(PopupContext);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) return;

    setLoading(true);
    try {
      await sendFeedback({ subject, message, currentUser });

      setPopupMessage("Thanks for the feedback! We appreciate your support.");
      setShowPopup(true);
      setSubject("");
      setMessage("");
    } catch (err) {
      console.error("Feedback error:", err);
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
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Title>Feedback</Title>
        <IntroText>
          We're always looking to improve CourtChamps! If you have any feedback
          or ideas, feel free to drop us a message!
        </IntroText>

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

export default UserFeedback;

// Styled Components
const Title = styled.Text({
  fontSize: 20,
  color: "white",
  fontWeight: "bold",
  marginBottom: 10,
});

const IntroText = styled.Text({
  color: "#ccc",
  fontSize: 13,
  marginBottom: 20,
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
