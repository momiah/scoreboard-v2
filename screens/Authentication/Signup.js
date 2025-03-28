import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import styled from "styled-components/native";
import { auth, db } from "../../services/firebase.config"; // import firebase configuration
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { newPlayer } from "../../components/Leagues/leagueMocks";

const Container = styled.View({
  flex: 1,
  backgroundColor: "#1a1a2e",
});

const ScrollContainer = styled.ScrollView({
  flexGrow: 1,
  padding: 20,
});

const Title = styled.Text({
  fontSize: 24,
  fontWeight: "bold",
  color: "#fff",
  textAlign: "center",
  marginBottom: 20,
});

const Label = styled.Text({
  color: "#fff",
  fontWeight: "bold",
  fontSize: 14,
  marginBottom: 5,
});

const Input = styled.TextInput({
  backgroundColor: "#2f3640",
  color: "#fff",
  borderRadius: 10,
  padding: 10,
  marginBottom: 10,
  fontSize: 16,
});

const ErrorText = styled.Text({
  color: "#ff7675",
  fontSize: 12,
  marginBottom: 10,
});

const RadioLabel = styled.Text({
  color: "#fff",
  fontWeight: "bold",
  marginBottom: 10,
  fontSize: 16,
});

const RadioGroup = styled.View({
  flexDirection: "row",
  justifyContent: "space-between", // Ensures equal spacing
  alignItems: "center",
  marginTop: 30,
  marginBottom: 60,
});

const RadioButtonWrapper = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
});

const RadioCircle = styled.View(({ selected }) => ({
  height: 18,
  width: 18,
  borderRadius: 9,
  borderWidth: 2,
  borderColor: "#fff",
  backgroundColor: selected ? "#fff" : "transparent",
  marginRight: 8,
}));

const RadioText = styled.Text({
  color: "#fff",
  fontSize: 14,
});

const Button = styled.TouchableOpacity({
  backgroundColor: "#3498db",
  padding: 15,
  borderRadius: 10,
  alignItems: "center",
  marginBottom: 20,
});

const ButtonText = styled.Text({
  color: "#fff",
  fontWeight: "bold",
  fontSize: 16,
});

const Signup = ({ route }) => {
  const { userName, userEmail, userId } = route.params || "";
  const [formData, setFormData] = useState({
    firstName: userName || "",
    lastName: "",
    username: "",
    email: userEmail || "",
    dob: "",
    location: "",
    handPreference: "Both",
    password: "",
    confirmPassword: "",
  });

  const navigation = useNavigation();
  const [errors, setErrors] = useState({});

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" }); // Clear errors on change
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";

    // Username validation: required and no whitespace allowed
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (/\s/.test(formData.username)) {
      newErrors.username = "Username cannot contain spaces";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.trim().length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    if (formData.password !== formData.confirmPassword && !userName)
      newErrors.confirmPassword = "Passwords do not match";

    if (
      !formData.email.trim() ||
      (!/\S+@\S+\.\S+/.test(formData.email) && !userName)
    )
      newErrors.email = "Valid email is required";

    if (!formData.dob.trim()) newErrors.dob = "Date of birth is required";

    if (!formData.location.trim()) newErrors.location = "Location is required";

    if (!formData.handPreference)
      newErrors.handPreference = "Hand preference is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm() && !userId) {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        const userId = userCredential.user.uid;

        // Store additional user data in Firestore
        await setDoc(doc(db, "users", userId), {
          firstName: formData.firstName.toLowerCase(),
          lastName: formData.lastName.toLowerCase(),
          username: formData.username.toLowerCase(),
          email: formData.email,
          dob: formData.dob,
          location: formData.location,
          handPreference: formData.handPreference,
          userId: userId,
          provider: "email_password",
          profileDetail: newPlayer,
        });
        Alert.alert(
          "Account Created",
          "Your account has been created successfully"
        );
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }], // Navigate to the main screen (Tabs)
        });
      } catch (error) {
        Alert.alert("Error", error.message);
      }
    } else {
      await setDoc(doc(db, "users", userId), {
        firstName: formData.firstName.toLowerCase(),
        lastName: formData.lastName.toLowerCase(),
        username: formData.username.toLowerCase(),
        email: formData.email,
        dob: formData.dob,
        location: formData.location,
        handPreference: formData.handPreference,
        userId: userId,
        provider: "gmail",
        profileDetail: newPlayer,
      });
      Alert.alert(
        "Account Created",
        "Your account has been created successfully"
      );
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }], // Navigate to the main screen (Tabs)
      });

      // Alert.alert('Account Created', 'Your account has been created successfully');
    }
  };

  return (
    <Container>
      <ScrollContainer>
        <Title>Create Account</Title>

        {/* First Name */}
        <Label>First Name</Label>
        <Input
          placeholder="First Name"
          placeholderTextColor="#aaa"
          value={formData.firstName}
          onChangeText={(text) => handleChange("firstName", text)}
        />
        {errors.firstName && <ErrorText>{errors.firstName}</ErrorText>}

        {/* Last Name */}
        <Label>Last Name</Label>
        <Input
          placeholder="Last Name"
          placeholderTextColor="#aaa"
          value={formData.lastName}
          onChangeText={(text) => handleChange("lastName", text)}
        />
        {errors.lastName && <ErrorText>{errors.lastName}</ErrorText>}

        {/* Username */}
        <Label>Username</Label>
        <Input
          placeholder="Username"
          placeholderTextColor="#aaa"
          value={formData.username}
          onChangeText={(text) => handleChange("username", text)}
        />
        {errors.username && <ErrorText>{errors.username}</ErrorText>}

        {/* Email */}
        {!userName && (
          <>
            <Label>Email</Label>
            <Input
              placeholder="Email"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              value={formData.email}
              onChangeText={(text) => handleChange("email", text)}
            />
            {errors.email && <ErrorText>{errors.email}</ErrorText>}

            {/* Password */}
            <Label>Password</Label>
            <Input
              placeholder="Password"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={formData.password}
              onChangeText={(text) => handleChange("password", text)}
            />
            {errors.password && <ErrorText>{errors.password}</ErrorText>}

            {/* Location */}
            <Label>Confirm Password</Label>
            <Input
              placeholder="Confirm Password"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={formData.confirmPassword}
              onChangeText={(text) => handleChange("confirmPassword", text)}
            />
            {errors.confirmPassword && (
              <ErrorText>{errors.confirmPassword}</ErrorText>
            )}
          </>
        )}

        {/* Date of Birth */}
        <Label>Date of Birth</Label>
        <Input
          placeholder="Date of Birth"
          placeholderTextColor="#aaa"
          value={formData.dob}
          onChangeText={(text) => handleChange("dob", text)}
        />
        {errors.dob && <ErrorText>{errors.dob}</ErrorText>}

        {/* Location */}
        <Label>Location</Label>
        <Input
          placeholder="Location"
          placeholderTextColor="#aaa"
          value={formData.location}
          onChangeText={(text) => handleChange("location", text)}
        />
        {errors.location && <ErrorText>{errors.location}</ErrorText>}

        {/* Hand Preference */}
        <RadioGroup>
          {["Right Hand", "Left Hand", "Both"].map((option) => (
            <RadioButtonWrapper
              key={option}
              onPress={() => handleChange("handPreference", option)}
            >
              <RadioCircle selected={formData.handPreference === option} />
              <RadioText>{option}</RadioText>
            </RadioButtonWrapper>
          ))}
        </RadioGroup>
        {errors.handPreference && (
          <ErrorText>{errors.handPreference}</ErrorText>
        )}

        {/* Submit Button */}
        <Button onPress={handleSubmit}>
          <ButtonText>Create</ButtonText>
        </Button>
      </ScrollContainer>
    </Container>
  );
};

export default Signup;
