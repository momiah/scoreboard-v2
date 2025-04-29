// Now, let's update the Signup component to fix the city selection bug and add loading state
import React, { useContext, useState, useEffect, useCallback } from "react";
import {
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  StyleSheet,
} from "react-native";
import ListDropdown from "../../components/ListDropdown/ListDropdown";
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
import { profileDetailSchema } from "../../schemas/schema";
import { Country, City } from "country-state-city";
import { userProfileSchema } from "../../schemas/schema";
import SearchableDropdown from "../../components/Location/SearchableDropdown";
import { loadCountries, loadCities } from "../../utils/locationData";

const Signup = ({ route }) => {
  const { userId: socialId, userName, userEmail } = route.params || {};
  const isSocialSignup = !!socialId;

  const [popupIcon, setPopupIcon] = useState("");
  const [popupButtonText, setPopupButtonText] = useState("");

  const [countries, setCountries] = useState([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState(null);

  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const navigation = useNavigation();

  const {
    handleShowPopup,
    setPopupMessage,
    popupMessage,
    setShowPopup,
    showPopup,
  } = useContext(PopupContext);

  const defaults = {
    ...userProfileSchema,
    password: "",
    confirmPassword: "",
    firstName: userName || "",
    email: userEmail || "",
    handPreference: "Both",
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
    setValue,
  } = useForm({ defaultValues: defaults });

  useEffect(() => {
    if (countries.length) return;

    setLoadingCountries(true);
    setTimeout(() => {
      try {
        const all = loadCountries();
        setCountries(all);
      } finally {
        setLoadingCountries(false);
      }
    }, 0);
  }, [countries]);

  const handleCityDropdownOpen = useCallback(async () => {
    if (!selectedCountryCode) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    try {
      const list = loadCities(selectedCountryCode);
      setCities(list);
    } catch (e) {
      console.error(e);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }, [selectedCountryCode]);

  const handleCloseSignUpConfirmationPopup = () => {
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
      const {
        password,
        confirmPassword,
        city: formCity,
        country: formCountry,
        ...profileFields
      } = data;

      // 2) Create the Auth user if needed
      let uid = socialId;
      if (!isSocialSignup) {
        const { user } = await createUserWithEmailAndPassword(
          auth,
          data.email,
          password
        );
        uid = user.uid;
      }

      const profileToSave = {
        ...userProfileSchema,
        ...profileFields,
        location: {
          country: formCountry,
          city: formCity,
          countryCode: selectedCountryCode,
        },
        userId: uid,
        provider: isSocialSignup ? "gmail" : "email_password",
        profileDetail: profileDetailSchema,
      };

      // 4) Write it once
      await setDoc(doc(db, "users", uid), profileToSave);

      // 5) Success UI…
      setPopupIcon("success");
      setPopupButtonText("Login");
      handleShowPopup("Account created successfully, please login to continue");
    } catch (error) {
      // catch both Auth and Firestore errors here
      const messages = {
        "auth/email-already-in-use": "Email already registered",
        "auth/weak-password": "Password is too weak",
        "auth/invalid-email": "Invalid email address",
      };
      setPopupIcon("error");
      setPopupButtonText("Close");
      handleShowPopup(messages[error.code] || error.message);
    }
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

  // Add to email validation rules
  const emailValidation = {
    required: "Email is required",
    pattern: {
      value: /\S+@\S+\.\S+/,
      message: "Invalid email format",
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={[1]} // dummy item, we just want to render a scrollable container
          keyExtractor={() => "signup-form"}
          contentContainerStyle={{ padding: 20 }}
          renderItem={() => (
            <>
              <Title>Create Account</Title>
              <Popup
                visible={showPopup}
                message={popupMessage}
                onClose={handleCloseSignUpConfirmationPopup}
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
                <SocialControllers
                  control={control}
                  getValues={getValues}
                  errors={errors}
                  emailValidation={emailValidation}
                  passwordValidation={passwordValidation}
                />
              )}

              <Controller
                name={"country"}
                control={control}
                label="Country"
                rules={{ required: "Country is required" }}
                render={({ field: { onChange, value } }) => (
                  <ListDropdown
                    label="Country"
                    setSelected={(val) => {
                      onChange(val);

                      const selectedCountry = countries.find(
                        (c) => c.value === val
                      );
                      const countryCode = selectedCountry?.key;

                      setSelectedCountryCode(countryCode);
                      setValue("city", "");
                      setCities([]);
                    }}
                    data={countries}
                    save="value"
                    placeholder={
                      loadingCountries
                        ? "Loading countries..."
                        : "Select country"
                    }
                    selectedOption={value ? { key: value, value } : null}
                    boxStyles={[
                      styles.box,
                      errors.country ? styles.errorBox : null,
                    ]}
                    inputStyles={styles.input}
                    dropdownStyles={styles.dropdown}
                    dropdownTextStyles={styles.dropdownText}
                    loading={loadingCountries}
                  />
                )}
              />

              <Controller
                control={control}
                name={"city"}
                label="City"
                rules={{ required: "City is required" }}
                render={({ field: { onChange, value } }) => (
                  <ListDropdown
                    label="City"
                    setSelected={(val) => {
                      onChange(val);
                      // setSelected?.(val);
                    }}
                    data={cities}
                    save="value"
                    placeholder={
                      selectedCountryCode
                        ? "Search cities..."
                        : "Select country first"
                    }
                    searchPlaceholder="Start typing..."
                    selectedOption={value ? { key: value, value } : null}
                    boxStyles={[
                      styles.box,
                      errors.country ? styles.errorBox : null,
                      !selectedCountryCode ? styles.disabledBox : null,
                    ]}
                    inputStyles={styles.input}
                    dropdownStyles={styles.dropdown}
                    dropdownTextStyles={styles.dropdownText}
                    loading={loadingCities}
                    onDropdownOpen={handleCityDropdownOpen}
                    disabled={!selectedCountryCode}
                  />
                )}
              />

              <HandPreference control={control} />
              <Button onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
                <ButtonText>
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </ButtonText>
              </Button>
            </>
          )}
        />
      </KeyboardAvoidingView>
    </Container>
  );
};

const HandPreference = ({ control }) => {
  return (
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
  );
};

const SocialControllers = ({
  control,
  getValues,
  errors,
  emailValidation,
  passwordValidation,
}) => {
  return (
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
  padding: 10,
  marginBottom: 10,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  color: "#fff",
  borderRadius: 5,
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

//
const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 15,
  },
  box: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 0,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: "#ff7675",
  },
  disabledBox: {
    opacity: 0.6,
  },
  input: {
    color: "#fff",
    paddingRight: 10,
  },
  dropdown: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 0,
    marginTop: 5,
  },
  dropdownText: {
    color: "#fff",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
});

export default Signup;
