import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AuthLayout from "../../components/signup/AuthLayout";
import {
  AuthField,
  OrDivider,
  PrimaryButton,
  SocialButtons,
} from "../../components/signup/formParts";
import SignupChrome from "../../components/signup/SignupChrome";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { AppEventsLogger } from "react-native-fbsdk-next";
import { auth } from "../../services/firebase.config";
import { UserContext } from "../../context/UserContext";
import { PopupContext } from "../../context/PopupContext";
import { registerForPushNotificationsAsync } from "../../services/pushNotifications";
import { useSocialAuth } from "../../components/signup/useSocialAuth";
import { EMAIL_MAX_LENGTH } from "./createAccount";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [iconScale] = useState(new Animated.Value(1));

  const { getUserById, setCurrentUser } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);

  const navigation = useNavigation();

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = email.trim().toLowerCase();

  const emailProblem = () => {
    if (!cleanEmail) return "Email is required.";
    if (cleanEmail.length > EMAIL_MAX_LENGTH) {
      return `Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) return "Enter a valid email address.";
    return "";
  };

  const passwordProblem = () => {
    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return "";
  };

  // Validation for Email
  const validateEmail = () => {
    setEmailError(emailProblem());
  };

  // Validation for Password
  const validatePassword = () => {
    setPasswordError(passwordProblem());
  };

  // Toggle Password Visibility
  const togglePasswordVisibility = () => {
    Animated.sequence([
      Animated.timing(iconScale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(iconScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => setShowPassword(!showPassword));
  };

  // Handle Login Button
  const handleLogin = async () => {
    if (submitting) return;
    const emailIssue = emailProblem();
    const passwordIssue = passwordProblem();
    setEmailError(emailIssue);
    setPasswordError(passwordIssue);
    if (!emailIssue && !passwordIssue) {
      setSubmitting(true);
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password,
        );
        const user = userCredential.user;

        if (!user.emailVerified) {
          // Resend the link so someone whose first email failed or got lost
          // isn't locked out. Firebase rate-limits repeat sends itself.
          let resent = false;
          try {
            await sendEmailVerification(user);
            resent = true;
          } catch (error) {
            console.error("Could not resend the verification email:", error);
          }
          await auth.signOut();
          showBottomToast(
            resent
              ? "Please verify your email first. We've sent a new link to your inbox."
              : "Please verify your email address before logging in.",
            "info",
          );
          return;
        }

        const token = await user.getIdToken();
        const userId = user.uid;

        await AsyncStorage.setItem("userToken", token);
        await AsyncStorage.setItem("userId", userId);
        await registerForPushNotificationsAsync(userId);

        const profile = await getUserById(userId);
        if (profile) {
          setCurrentUser(profile);
        } else {
          <Text>Unable to sign in...</Text>;
        }

        AppEventsLogger.logEvent(AppEventsLogger.AppEvents.Login, {
          [AppEventsLogger.AppEventParams.RegistrationMethod]: "email",
        });

        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      } catch (error) {
        // Wrong password, unknown email and invalid credential all read the same,
        // so the screen never reveals whether an account exists for an email.
        const wrongCredentials = "Incorrect email or password.";
        const messages = {
          "auth/invalid-email": "Enter a valid email address.",
          "auth/invalid-credential": wrongCredentials,
          "auth/user-not-found": wrongCredentials,
          "auth/wrong-password": wrongCredentials,
          "auth/user-disabled": "User account is disabled",
          "auth/too-many-requests":
            "Too many attempts. Please wait a moment and try again.",
          "auth/network-request-failed":
            "Network error. Check your connection and try again.",
        };
        const errorMessage = messages[error.code] || "Login failed.";
        showBottomToast(errorMessage, "error");

        AppEventsLogger.logEvent("LoginFailed", {
          reason: error.code || error.message,
          method: "email",
        });
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!cleanEmail) {
      showBottomToast("Please enter your email address first.", "info");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (error) {
      // An unknown email gets the same reply as a known one, so this screen can't
      // be used to find out who has an account.
      if (error.code !== "auth/user-not-found") {
        const messages = {
          "auth/invalid-email": "Enter a valid email address.",
          "auth/too-many-requests":
            "Too many attempts. Please wait a moment and try again.",
          "auth/network-request-failed":
            "Network error. Check your connection and try again.",
        };
        showBottomToast(
          messages[error.code] || "Failed to send reset email.",
          "error",
        );
        console.log("Password Reset Error:", error.message);
        return;
      }
    }
    showBottomToast(
      "If an account exists for that email, a password reset link is on its way.",
      "success",
    );
  };

  // Same Google / Apple path as the sign-up flow: existing players go Home,
  // new players continue on the new flow's profile step.
  const social = useSocialAuth({
    getUserById,
    onExisting: (profile, method) => {
      setCurrentUser(profile);
      AppEventsLogger.logEvent(AppEventsLogger.AppEvents.Login, {
        [AppEventsLogger.AppEventParams.RegistrationMethod]: method,
      });
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    },
    onNeedsSignup: (params) => {
      navigation.reset({
        index: 0,
        routes: [{ name: "SignupIntro", params: { socialSignup: params } }],
      });
    },
  });

  return (
    <SignupChrome>
      <AuthLayout
        brand="icon"
        cardGlow={false}
        cardTransparent
        align="top"
        title="Welcome back"
        subtitle=""
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        testIDPrefix="login"
        footer={
          <View style={styles.registerRow}>
            <Text style={styles.registerMuted}>New to Court Champs? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("SignupIntro")}
              testID="login-register"
            >
              <Text style={styles.registerLink}>Create account</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <SocialButtons
          compact
          busy={social.busy}
          onApple={() => social.run("apple")}
          onGoogle={() => social.run("google")}
          testIDPrefix="login"
        />
        <OrDivider label="or log in with email" />

        <AuthField
          icon="mail-outline"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          onBlur={validateEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          maxLength={EMAIL_MAX_LENGTH}
          spellCheck={false}
          error={emailError}
          testID="login-email"
        />
        <AuthField
          icon="lock-closed-outline"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          onBlur={validatePassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          error={passwordError}
          testID="login-password"
          right={
            password ? (
              <TouchableOpacity onPress={togglePasswordVisibility} hitSlop={10}>
                <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#aaa"
                  />
                </Animated.View>
              </TouchableOpacity>
            ) : null
          }
        />

        <TouchableOpacity
          onPress={handleForgotPassword}
          style={styles.forgotButton}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <PrimaryButton
          label="Log in"
          onPress={handleLogin}
          loading={submitting}
          testID="login-submit"
        />
      </AuthLayout>
    </SignupChrome>
  );
}

const styles = StyleSheet.create({
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -4,
  },
  forgotText: {
    color: "#00A2FF",
    fontSize: 14,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerMuted: {
    color: "#aaa",
    fontSize: 14,
  },
  registerLink: {
    color: "#00A2FF",
    fontSize: 14,
    fontWeight: "bold",
  },
});
