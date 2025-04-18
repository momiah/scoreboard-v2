// Now, let's update the Signup component to fix the city selection bug and add loading state
import React, { useContext, useState, useEffect, useCallback } from "react";
import {
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
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
import SearchableDropdown from "../../components/Location/SearchableDropdown";

const Signup = ({ route }) => {
  const { userId, userName, userEmail } = route.params || {};
  const isSocialSignup = !!userId;
  const [popupIcon, setPopupIcon] = useState("");
  const [popupButtonText, setPopupButtonText] = useState("");
  // const [loadingCities, setLoadingCities] = useState(false);

  // Inside your Signup component:
  const [countries, setCountries] = useState([]);
  // const [cities, setCities] = useState([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState(null);

  // Load countries on mount
  useEffect(() => {
    const allCountries = Country.getAllCountries().map((country) => ({
      key: country.isoCode,
      value: country.name,
    }));
    setCountries(allCountries);
  }, []);

  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (selectedCountryCode) {
      // Verify country code format (important!)
      console.log("Selected country code:", selectedCountryCode);
    }
  }, [selectedCountryCode]);

  const handleCityDropdownOpen = useCallback(async () => {
    if (!selectedCountryCode) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    try {
      const allCities = City.getCitiesOfCountry(selectedCountryCode) || [];
      console.log("Raw cities data:", allCities); // Debug log

      // More reliable unique city filtering
      const cityMap = new Map();
      allCities.forEach((city) => {
        if (city.name && !cityMap.has(city.name)) {
          cityMap.set(city.name, city);
        }
      });

      const uniqueCities = Array.from(cityMap.values()).map((city) => ({
        key: city.name + "-" + (city.latitude || "") + (city.longitude || ""),
        value: city.name,
      }));

      console.log("Processed cities:", uniqueCities);
      setCities(uniqueCities);
    } catch (error) {
      console.error("City loading error:", error);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }, [selectedCountryCode]);

  // useEffect(() => {
  //   if (selectedCountryCode) {
  //     setLoadingCities(true);

  //     // Simulate network delay to show loading state
  //     const timer = setTimeout(() => {
  //       // Get cities and remove duplicates
  //       const allCities = City.getCitiesOfCountry(selectedCountryCode);

  //       // Use a Set to track unique city names and remove duplicates
  //       const uniqueCityNames = new Set();
  //       const uniqueCities = allCities
  //         .filter((city) => {
  //           // If we haven't seen this city name before, keep it
  //           if (!uniqueCityNames.has(city.name)) {
  //             uniqueCityNames.add(city.name);
  //             return true;
  //           }
  //           return false;
  //         })
  //         .map((city) => ({
  //           key: city.name,
  //           value: city.name,
  //         }));

  //       console.log("Unique cities:", uniqueCities.length);
  //       setCities(uniqueCities);
  //       setLoadingCities(false);
  //     }, 800);

  //     return () => clearTimeout(timer);
  //   } else {
  //     setCities([]);
  //   }
  // }, [selectedCountryCode]);

  // console.log("countries", countries.length);
  // console.log("cities", cities.length);

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
    setValue,
    setError,
    clearErrors,
    watch,
  } = useForm({
    defaultValues: {
      firstName: userName || "",
      lastName: "",
      username: "",
      email: userEmail || "",
      country: "",
      city: "",
      handPreference: "Both",
      password: "",
      confirmPassword: "",
    },
  });

  // // Watch city value to debug
  // const cityValue = watch("city");

  // useEffect(() => {
  //   console.log("City value changed:", cityValue);
  // }, [cityValue]);

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

  // Then in your onSubmit:
  const onSubmit = async (data) => {
    try {
      // Make sure to include location data in the user document
      const locationData = {
        country: data.country,
        city: data.city,
      };

      // Add location to the data object
      const dataWithLocation = {
        ...data,
        location: locationData,
      };

      if (isSocialSignup) {
        await createSocialUser(dataWithLocation);
      } else {
        // Check email uniqueness in Firestore first
        const emailExists = await checkEmailExists(data.email);
        if (emailExists) {
          handleShowPopup("Email already registered");
          setPopupIcon("error");
          setPopupButtonText("Close");
          return;
        }

        await createEmailUser(dataWithLocation);
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
      setPopupButtonText("Close");
      handleShowPopup(errorMessages[error.code] || error.message);
    }
  };

  const createUserDocument = async (uid, provider, data) => {
    await setDoc(doc(db, "users", uid), {
      firstName: data.firstName.toLowerCase(),
      lastName: data.lastName.toLowerCase(),
      username: data.username.toLowerCase(),
      email: data.email,
      location: data.location, // This now contains country and city
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={[1]} // dummy item, we just want to render a scrollable container
          keyExtractor={() => "signup-form"}
          renderItem={() => (
            <>
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
                <SocialControllers
                  control={control}
                  getValues={getValues}
                  errors={errors}
                  emailValidation={emailValidation}
                  passwordValidation={passwordValidation}
                />
              )}

              <SearchableDropdown
                control={control}
                name="country"
                label="Country"
                rules={{ required: "Country is required" }}
                placeholder="Select country"
                searchPlaceholder="Search country..."
                data={countries}
                setSelected={(val) => {
                  // Get country code using ISO code from the country object
                  const selectedCountry = countries.find(
                    (c) => c.value === val
                  );
                  const countryCode = selectedCountry?.key;
                  console.log("Selected country:", val, "Code:", countryCode);
                  setSelectedCountryCode(countryCode);
                  setValue("city", ""); // Clear city when country changes
                  setCities([]); // Clear previous cities
                }}
                error={errors.country}
              />
              <SearchableDropdown
                control={control}
                name="city"
                label="City"
                rules={{ required: "City is required" }}
                placeholder={
                  selectedCountryCode
                    ? loadingCities
                      ? "Loading cities..."
                      : "Search cities..."
                    : "Select country first"
                }
                searchPlaceholder="Start typing..."
                data={cities}
                disabled={!selectedCountryCode}
                loading={loadingCities}
                onDropdownOpen={handleCityDropdownOpen}
                error={errors.city}
              />

              <HandPreference control={control} />

              <Button onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
                <ButtonText>
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </ButtonText>
              </Button>
            </>
          )}
          contentContainerStyle={{ padding: 20 }}
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
  backgroundColor: "#262626",
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

export default Signup;
