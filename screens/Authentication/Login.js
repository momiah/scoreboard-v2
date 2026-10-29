import { sha256 } from "js-sha256";
import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
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
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { AppEventsLogger } from "react-native-fbsdk-next";
import { auth } from "../../services/firebase.config";
import { UserContext } from "../../context/UserContext";
import { registerForPushNotificationsAsync } from "../../services/pushNotifications";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { GOOGLE_WEB_CLIENT_ID } from "@env";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [iconScale] = useState(new Animated.Value(1));

  const { getUserById, setCurrentUser } = useContext(UserContext);

  const navigation = useNavigation();

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = email.trim().toLowerCase();

  const emailProblem = () => {
    if (!cleanEmail) return "Email is required.";
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
          await auth.signOut();
          Alert.alert(
            "Verify Email",
            "Please verify your email address before logging in.",
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
        Alert.alert("Error", errorMessage);

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
      Alert.alert("Enter your email", "Please enter your email address first.");
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
        Alert.alert(
          "Error",
          messages[error.code] || "Failed to send reset email.",
        );
        console.log("Password Reset Error:", error.message);
        return;
      }
    }
    Alert.alert(
      "Check your inbox",
      "If an account exists for that email, a password reset link is on its way.",
    );
  };

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();

      const response = await GoogleSignin.signIn();

      if (response.type !== "success") {
        return;
      }

      const googleCredential = GoogleAuthProvider.credential(
        response.data.idToken,
      );
      const email = response.data.user.email;
      const existingMethods = await fetchSignInMethodsForEmail(auth, email);
      if (
        existingMethods.length > 0 &&
        !existingMethods.includes("google.com")
      ) {
        Alert.alert(
          "Account Already Exists",
          "An account with this email already exists. Please log in with your original method and connect Google from your profile.",
        );
        return;
      }

      const userCredential = await signInWithCredential(auth, googleCredential);
      const user = userCredential.user;
      const token = await user.getIdToken();
      const userId = user.uid;

      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userId", userId);
      await registerForPushNotificationsAsync(userId);

      const profile = await getUserById(userId);

      if (profile) {
        setCurrentUser(profile);

        AppEventsLogger.logEvent(AppEventsLogger.AppEvents.Login, {
          [AppEventsLogger.AppEventParams.RegistrationMethod]: "google",
        });

        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      } else {
        const userData = response.data.user;
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "Signup",
              params: {
                userName: userData.givenName,
                userLastName: userData.familyName,
                userEmail: userData.email,
                userId: userId,
                provider: "google",
              },
            },
          ],
        });
      }
    } catch (error) {
      console.error("Google Login Error:", error.message);
      if (error.code === "auth/account-exists-with-different-credential") {
        Alert.alert(
          "Account Already Exists",
          "An account with this email already exists. Please log in with your original method.",
        );
      } else {
        Alert.alert("Error", "Google sign-in failed. Please try again.");
      }
    }
  };

  const handleAppleLogin = async () => {
    try {
      const rawNonce = Math.random().toString(36).substring(2);
      const hashedNonce = sha256(rawNonce);

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const {
        identityToken,
        fullName,
        email: appleEmail,
        user: appleUserId,
      } = appleCredential;
      if (!identityToken) throw new Error("No identity token");

      // Apple returns name/email ONLY on first-ever sign-in. Persist it keyed by Apple user ID.
      const storageKey = `appleUser:${appleUserId}`;
      let cachedName = { givenName: "", familyName: "" };
      let cachedEmail = "";

      if (fullName?.givenName || appleEmail) {
        cachedName = {
          givenName: fullName?.givenName || "",
          familyName: fullName?.familyName || "",
        };
        cachedEmail = appleEmail || "";
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({ name: cachedName, email: cachedEmail }),
        );
      } else {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          cachedName = parsed.name;
          cachedEmail = parsed.email;
        }
      }

      const provider = new OAuthProvider("apple.com");
      const firebaseCredential = provider.credential({
        idToken: identityToken,
        rawNonce: rawNonce,
      });

      const userCredential = await signInWithCredential(
        auth,
        firebaseCredential,
      );
      const user = userCredential.user;
      const token = await user.getIdToken();
      const userId = user.uid;

      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userId", userId);
      await registerForPushNotificationsAsync(userId);

      const profile = await getUserById(userId);

      if (profile) {
        setCurrentUser(profile);

        AppEventsLogger.logEvent(AppEventsLogger.AppEvents.Login, {
          [AppEventsLogger.AppEventParams.RegistrationMethod]: "apple",
        });

        navigation.reset({ index: 0, routes: [{ name: "Home" }] });
      } else {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: "Signup",
              params: {
                userName: cachedName.givenName,
                userLastName: cachedName.familyName,
                userEmail: cachedEmail || user.email || "",
                userId: userId,
                provider: "apple",
              },
            },
          ],
        });
      }
    } catch (error) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      console.error("Apple Login Error:", error.message);
      if (error.code === "auth/account-exists-with-different-credential") {
        Alert.alert(
          "Account Already Exists",
          "An account with this email already exists. Please log in with your original method.",
        );
      } else {
        Alert.alert("Error", "Apple sign-in failed. Please try again.");
      }
    }
  };

  const onSocialLogin = (type) => {
    if (type === "google") {
      handleGoogleLogin();
    } else if (type === "apple") {
      handleAppleLogin();
    }
  };

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
          busy={null}
          onApple={() => onSocialLogin("apple")}
          onGoogle={() => onSocialLogin("google")}
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
