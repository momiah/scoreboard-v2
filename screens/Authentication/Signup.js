import React, { useContext, useState } from "react";
import { Alert, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import styled from "styled-components/native";
import { auth, db } from "../../services/firebase.config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  setDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import Popup from "../../components/popup/Popup";
import { PopupContext } from "../../context/PopupContext";
import { userProfileSchema, profileDetailSchema } from "../../schemas/schema";

const Signup = ({ route }) => {
  const { userId, userName, userEmail } = route.params || {};
  const isSocialSignup = !!userId;
  const [popupIcon, setPopupIcon] = useState("");
  const [popupButtonText, setPopupButtonText] = useState("");
  const navigation = useNavigation();
  const {
    handleShowPopup,
    setPopupMessage,
    popupMessage,
    setShowPopup,
    showPopup,
  } = useContext(PopupContext);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm({
    defaultValues: {
      firstName: userName || "",
      lastName: "",
      username: "",
      email: userEmail || "",
      location: "",
      handPreference: "Both",
      password: "",
      confirmPassword: "",
    },
  });

  const handleClosePopup = () => {
    setShowPopup(false);
    setPopupMessage("");

    if (popupButtonText === "Login") {
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    }
  };

  const onSubmit = async (data) => {
    try {
      if (isSocialSignup) {
        await createSocialUser(data);
      } else {
        // Check email uniqueness in Firestore first
        const emailExists = await checkEmailExists(data.email);
        if (emailExists) {
          handleShowPopup("Email already registered");
          setPopupIcon("error");
          setPopupButtonText("Close");
          return;
        }

        await createEmailUser(data);
      }

      setPopupIcon("success");
      setPopupButtonText("Login");
      handleShowPopup("Account created successfully, please login to continue");
    } catch (error) {
      // console.error("Signup Error:", error);

      // Handle Firebase Auth errors
      const errorMessages = {
        "auth/email-already-in-use": "Email already registered",
        "auth/weak-password": "Password is too weak",
        "auth/invalid-email": "Invalid email address",
        "auth/username-already-exists": "Username already registered",
      };

      setPopupIcon("error");
      handleShowPopup(errorMessages[error.code] || error.message);
    }
  };

  const createUserDocument = async (uid, provider, data) => {
    await setDoc(doc(db, "users", uid), {
      firstName: data.firstName.toLowerCase(),
      lastName: data.lastName.toLowerCase(),
      username: data.username.toLowerCase(),
      email: data.email,
      location: data.location,
      handPreference: data.handPreference,
      userId: uid,
      provider,
      profileDetail: profileDetailSchema,
    });
  };

  const createEmailUser = async (data) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    await createUserDocument(userCredential.user.uid, "email_password", data);
  };

  const createSocialUser = async (data) => {
    await createUserDocument(userId, "gmail", data);
  };

  // Updated password validation rules
  const passwordValidation = {
    required: "Password is required",
    minLength: {
      value: 6,
      message: "Password must be at least 6 characters",
    },
    validate: {
      hasValidChars: (value) =>
        /^[\w\W]*$/.test(value) || "Invalid characters in password",
    },
  };

  const checkEmailExists = async (email) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking email:", error);
      return true;
    }
  };

  // Add to email validation rules
  const emailValidation = {
    required: "Email is required",
    pattern: {
      value: /\S+@\S+\.\S+/,
      message: "Invalid email format",
    },
    validate: {
      uniqueEmail: async (value) =>
        !(await checkEmailExists(value)) || "Email already registered",
    },
  };

  const checkUsernameExists = async (username) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("username", "==", username.toLowerCase())
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking username:", error);
      return true; // Prevent submission if check fails
    }
  };

  // Updated username validation rules
  const usernameValidation = {
    required: "Username is required",
    minLength: {
      value: 4,
      message: "Username must be at least 4 characters",
    },
    maxLength: {
      value: 10,
      message: "Username cannot exceed 10 characters",
    },
    validate: {
      noSpaces: (value) => !/\s/.test(value) || "Spaces are not allowed",
      validCharacters: (value) =>
        /^[a-zA-Z0-9-]+$/.test(value) ||
        "Only letters, numbers, and dashes (-) are allowed",
      uniqueUsername: async (value) =>
        !(await checkUsernameExists(value)) || "Username already exists",
    },
  };

  return (
    <Container>
      <ScrollContainer>
        <Title>Create Account</Title>

        <Popup
          visible={showPopup}
          message={popupMessage}
          onClose={handleClosePopup}
          type={popupIcon}
          buttonText={popupButtonText}
        />

        <Controller
          control={control}
          name="firstName"
          rules={{ required: "First name is required" }}
          render={({ field }) => (
            <InputWrapper
              label="First Name"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.firstName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="lastName"
          rules={{ required: "Last name is required" }}
          render={({ field }) => (
            <InputWrapper
              label="Last Name"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.lastName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="username"
          rules={usernameValidation}
          render={({ field }) => (
            <InputWrapper
              label="Username"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.username?.message}
            />
          )}
        />

        {!isSocialSignup && (
          <>
            <Controller
              control={control}
              name="email"
              rules={emailValidation}
              render={({ field }) => (
                <InputWrapper
                  label="Email"
                  value={field.value}
                  onChangeText={field.onChange}
                  keyboardType="email-address"
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={passwordValidation}
              render={({ field }) => (
                <InputWrapper
                  label="Password"
                  value={field.value}
                  onChangeText={field.onChange}
                  secureTextEntry
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              rules={{
                required: "Confirm password is required",
                validate: (value) =>
                  value === getValues("password") || "Passwords do not match",
              }}
              render={({ field }) => (
                <InputWrapper
                  label="Confirm Password"
                  value={field.value}
                  onChangeText={field.onChange}
                  secureTextEntry
                  error={errors.confirmPassword?.message}
                />
              )}
            />
          </>
        )}

        <Controller
          control={control}
          name="location"
          rules={{ required: "Location is required" }}
          render={({ field }) => (
            <InputWrapper
              label="Location"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.location?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="handPreference"
          render={({ field }) => (
            <RadioGroup>
              {["Right Hand", "Left Hand", "Both"].map((option) => (
                <RadioButtonWrapper
                  key={option}
                  onPress={() => field.onChange(option)}
                >
                  <RadioCircle selected={field.value === option} />
                  <RadioText>{option}</RadioText>
                </RadioButtonWrapper>
              ))}
            </RadioGroup>
          )}
        />

        <Button onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
          <ButtonText>
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </ButtonText>
        </Button>
      </ScrollContainer>
    </Container>
  );
};

const InputWrapper = ({ label, error, ...props }) => (
  <>
    <Label>{label}</Label>
    <Input {...props} placeholderTextColor="#aaa" />
    {error && <ErrorText>{error}</ErrorText>}
  </>
);

const Container = styled.View({
  flex: 1,
  backgroundColor: "rgba(2, 13, 24, 1)", // Translucent dark blue
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
  marginBottom: 30,
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

const CheckingText = styled.Text({
  color: "#fff",
  fontSize: 12,
  marginTop: 5,
});

export default Signup;
