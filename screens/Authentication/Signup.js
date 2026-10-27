import React, { useContext, useState, useCallback } from "react";
import { UserContext } from "../../context/UserContext";
import { KeyboardAvoidingView, Platform, FlatList } from "react-native";
import {
  CountrySelector,
  CitySelector,
} from "../../components/Modals/CountryCitySelectionModal";
import { AntDesign } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import Popup from "../../components/popup/Popup";
import { PopupContext } from "../../context/PopupContext";
import { AppEventsLogger } from "react-native-fbsdk-next";
import { userProfileSchema } from "@shared";
import {
  createCourtChampsAccount,
  emailValidation,
  nameValidation,
  passwordValidation,
  signupErrorMessage,
  usernameValidation,
} from "./createAccount";

const Signup = ({ route }) => {
  const {
    userId: socialId,
    userName,
    userLastName,
    userEmail,
    provider: socialProvider,
  } = route.params || {};
  const isSocialSignup = !!socialId;
  const { setCurrentUser } = useContext(UserContext);

  const [popupIcon, setPopupIcon] = useState("");
  const [popupButtonText, setPopupButtonText] = useState("");

  const [selectedCountryCode, setSelectedCountryCode] = useState(null);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [showCitySelector, setShowCitySelector] = useState(false);

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
    lastName: userLastName || "",
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

  const handleCountrySelected = useCallback(
    (selectedCountry) => {
      setValue("country", selectedCountry.value, { shouldValidate: true });
      setValue("city", "");
      setSelectedCountryCode(selectedCountry.key);
      setShowCitySelector(true);
    },
    [setValue],
  );

  const handleCitySelected = useCallback(
    (selectedCity) => {
      setValue("city", selectedCity.value, { shouldValidate: true });
      setShowCitySelector(false);
      setShowCountrySelector(false);
    },
    [setValue],
  );

  const handleCloseSignUpConfirmationPopup = () => {
    setShowPopup(false);
    setPopupMessage("");

    if (popupButtonText === "Login" || popupButtonText === "Continue") {
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    }
  };

  const onSubmit = async (data) => {
    try {
      const { isSocialSignup: createdWithSocial } =
        await createCourtChampsAccount({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          username: data.username,
          country: data.country,
          city: data.city,
          countryCode: selectedCountryCode,
          handPreference: data.handPreference,
          socialId,
          socialProvider,
          setCurrentUser,
        });

      setPopupIcon("success");
      setPopupButtonText(createdWithSocial ? "Continue" : "Login");
      handleShowPopup(
        createdWithSocial
          ? "Account created successfully!"
          : "Account created successfully, please verify your email and login to continue",
      );
    } catch (error) {
      AppEventsLogger.logEvent("RegistrationFailed", {
        reason: error.code || error.message,
      });

      setPopupIcon("error");
      setPopupButtonText("Close");
      handleShowPopup(signupErrorMessage(error));
    }
  };

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={[1]}
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
                rules={nameValidation}
                render={({ field }) => (
                  <InputWrapper
                    label="First Name"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.firstName?.message}
                    autoCapitalize="words"
                  />
                )}
              />
              <Controller
                control={control}
                name="lastName"
                rules={nameValidation}
                render={({ field }) => (
                  <InputWrapper
                    label="Last Name"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={errors.lastName?.message}
                    autoCapitalize="words"
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
              <Label>Location</Label>
              <Controller
                name={"country"}
                control={control}
                rules={{ required: "Country is required" }}
                render={({ field: { value: countryValue } }) => (
                  <Controller
                    control={control}
                    name={"city"}
                    rules={{ required: "City is required" }}
                    render={({ field: { value: cityValue } }) => (
                      <LocationButton
                        hasError={!!(errors.country || errors.city)}
                        onPress={() => setShowCountrySelector(true)}
                      >
                        <LocationButtonText
                          selected={!!(countryValue && cityValue)}
                        >
                          {countryValue && cityValue
                            ? `${cityValue}, ${countryValue}`
                            : "Select country & city"}
                        </LocationButtonText>
                        <AntDesign name="right" size={16} color="#888" />
                      </LocationButton>
                    )}
                  />
                )}
              />
              {(errors.country || errors.city) && (
                <ErrorText>Country and city are required</ErrorText>
              )}
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

      <CountrySelector
        visible={showCountrySelector}
        onClose={() => setShowCountrySelector(false)}
        onSelect={handleCountrySelected}
      >
        <CitySelector
          visible={showCitySelector}
          onBack={() => setShowCitySelector(false)}
          countryCode={selectedCountryCode}
          onSelect={handleCitySelected}
        />
      </CountrySelector>
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
    <Input
      placeholderTextColor="#aaa"
      autoCorrect={false}
      autoCapitalize="none"
      autoComplete="off"
      spellCheck={false}
      {...props}
    />
    {error && <ErrorText>{error}</ErrorText>}
  </>
);

const Container = styled.View({
  flex: 1,
  backgroundColor: "rgba(2, 13, 24, 1)",
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
const RadioGroup = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
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
const LocationButton = styled.TouchableOpacity(({ hasError }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 10,
  marginBottom: 10,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 5,
  borderWidth: hasError ? 1 : 0,
  borderColor: hasError ? "#ff7675" : "transparent",
}));
const LocationButtonText = styled.Text(({ selected }) => ({
  color: selected ? "#fff" : "#aaa",
  fontSize: 14,
  flexShrink: 1,
}));

export default Signup;
