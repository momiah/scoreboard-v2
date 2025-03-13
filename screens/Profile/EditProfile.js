// EditProfile.js
import React, { useContext, useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Alert,
  Text,
  TouchableOpacity,
} from "react-native";
import styled from "styled-components/native";
import { UserContext } from "../../context/UserContext";
import Ionicons from "@expo/vector-icons/Ionicons";
// import Button from "../components/Button"; // Assume you have a Button component

const EditProfile = ({ navigation }) => {
  const { currentUser, updateUserProfile } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    location: "",
    handPreference: "",
    bio: "",
    email: "",
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        location: currentUser.location || "",
        handPreference: currentUser.handPreference || "",
        bio: currentUser.bio || "",
        email: currentUser.email || "",
      });
    }
  }, [currentUser]);

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await updateUserProfile(formData);
      Alert.alert("Success", "Profile updated successfully");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <HeaderTitle>Edit Profile</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Section>
          <SectionTitle>Location</SectionTitle>
          <Input
            value={formData.location}
            onChangeText={(text) =>
              setFormData({ ...formData, location: text })
            }
            placeholder="Enter your location"
            placeholderTextColor={"#aaa"}
          />
        </Section>

        <Section>
          <SectionTitle>Hand Preference</SectionTitle>
          <PreferenceContainer>
            {["Left", "Right", "Ambidextrous"].map((pref) => (
              <PreferenceButton
                key={pref}
                selected={formData.handPreference === pref}
                onPress={() =>
                  setFormData({ ...formData, handPreference: pref })
                }
              >
                <PreferenceText selected={formData.handPreference === pref}>
                  {pref}
                </PreferenceText>
              </PreferenceButton>
            ))}
          </PreferenceContainer>
        </Section>

        <Section>
          <SectionTitle>Bio</SectionTitle>
          <Input
            value={formData.bio}
            onChangeText={(text) => setFormData({ ...formData, bio: text })}
            placeholder="Tell us about yourself"
            multiline
            placeholderTextColor={"#aaa"}
            style={{ height: 150 }}
          />
        </Section>

        <Section>
          <SectionTitle>Contact Email</SectionTitle>
          <Input
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={"#aaa"}
          />
        </Section>

        <ButtonWrapper>
          <ConfirmButton onPress={handleUpdate}>
            <Text>Update Profile</Text>
          </ConfirmButton>
        </ButtonWrapper>
      </ScrollView>
    </Container>
  );
};

// Styled components
const Container = styled.View`
  flex: 1;
  background-color: rgb(3, 16, 31);
  padding: 20px;
`;

const ConfirmButton = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: 24,
  fontWeight: "bold",
  marginBottom: 15,

  padding: 10,
  borderRadius: 8,
  backgroundColor: "#00A2FF",
});

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const HeaderTitle = styled.Text`
  color: white;
  font-size: 18px;
  font-weight: bold;
`;

const Section = styled.View`
  margin-bottom: 25px;
`;

const SectionTitle = styled.Text`
  color: white;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 10px;
`;

const Input = styled.TextInput`
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  padding: 12px 15px;
  border-radius: 8px;
  font-size: 16px;
`;

const PreferenceContainer = styled.View`
  flex-direction: row;
  gap: 10px;
  flex-wrap: wrap;
`;

const PreferenceButton = styled.TouchableOpacity`
  padding: 10px 20px;
  border-radius: 5px;
  background-color: ${({ selected }) => (selected ? "#00284b" : "#00152B")};
  border: 1px solid ${({ selected }) => (selected ? "#004eb4" : "#414141")};
`;

const PreferenceText = styled.Text`
  color: ${({ selected }) => (selected ? "white" : "#aaa")};
  font-size: 14px;
`;

const ButtonWrapper = styled.View`
  margin-top: 30px;
  margin-bottom: 50px;
`;

const styles = {
  content: {
    paddingTop: 10,
    paddingBottom: 30,
  },
};

export default EditProfile;
