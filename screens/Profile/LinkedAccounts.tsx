import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import {
  LoginManager,
  AccessToken,
  AuthenticationToken,
} from "react-native-fbsdk-next";
import {
  FacebookAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  GoogleAuthProvider,
  linkWithCredential,
} from "firebase/auth";
import { sha256 } from "js-sha256";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { auth } from "../../services/firebase.config";
// @ts-expect-error - GOOGLE_WEB_CLIENT_ID is defined in the .env file
import { GOOGLE_WEB_CLIENT_ID } from "@env";
import styled from "styled-components/native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

// Screen padding: same intent as zinx/social-auth-google-and-fb-android — extra top offset on
// Android only; iOS uses 0 here (nav / SafeArea). Safe to replace this file across branches.
const LINKED_ACCOUNTS_PADDING_TOP = Platform.OS === "android" ? 60 : 0;

const LinkedAccounts = () => {
  const navigation = useNavigation();

  const [isLinking, setIsLinking] = useState(false);
  const [existingLinkedAccounts, setExistingLinkedAccounts] = useState<
    string[]
  >([]);

  const loadExistingLinkedAccounts = async () => {
    const user = auth.currentUser;
    if (user) {
      await user.reload();
      const providers = user.providerData.map((p) => p.providerId);
      setExistingLinkedAccounts(providers);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const providers = user.providerData.map((p) => p.providerId);
        setExistingLinkedAccounts(providers);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  const menuOptions = [
    {
      label: "Google",
      icon: "logo-google",
      action: "Google",
      isLinked: existingLinkedAccounts.includes("google.com"),
    },
    {
      label: "Facebook",
      icon: "logo-facebook",
      action: "Facebook",
      isLinked: existingLinkedAccounts.includes("facebook.com"),
    },
    // { label: "Apple", icon: "logo-apple", action: "Apple", isLinked: existingLinkedAccounts.includes("apple.com") },
  ];

  const handlePress = async (action: string) => {
    setIsLinking(true);
    try {
      switch (action) {
        case "Google":
          if (existingLinkedAccounts.includes("google.com")) {
            Alert.alert("Already Linked", "Google account already linked.");
            return;
          }
          await linkWithGoogle();
          break;
        case "Facebook":
          if (existingLinkedAccounts.includes("facebook.com")) {
            Alert.alert("Already Linked", "Facebook account already linked.");
            return;
          }
          await linkWithFacebook();
          break;
        case "Apple":
          await linkWithApple();
          break;
      }
      await loadExistingLinkedAccounts();
    } catch (error) {
      console.error("Error linking account:", error);
      const err = error as { code?: string; message?: string };
      if (err.code === "auth/credential-already-in-use") {
        Alert.alert("Error", "This account is already linked to another user.");
      } else if (err.code === "auth/requires-recent-login") {
        Alert.alert(
          "Sign in again",
          "For security, sign out and sign back in, then try linking Facebook again.",
        );
      } else if (err.code === "auth/provider-already-linked") {
        Alert.alert(
          "Already linked",
          "Facebook is already linked to this account.",
        );
      } else if (err.code === "auth/invalid-credential") {
        Alert.alert(
          "Facebook login incomplete",
          "Facebook did not return a valid session. Please try again.",
        );
      } else if (err.message === "FACEBOOK_LOGIN_CANCELLED") {
        // already alerted in linkWithFacebook
      } else if (err.message === "FACEBOOK_NO_AUTH_TOKEN") {
        Alert.alert(
          "Facebook",
          "Could not read your Facebook login after returning to the app. Please try again.",
        );
      } else {
        Alert.alert(
          "Error",
          err.message || "Error linking account. Please try again.",
        );
      }
    } finally {
      setIsLinking(false);
    }
  };

  const linkWithGoogle = async () => {
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices();
    }
    await GoogleSignin.signOut();
    const response = await GoogleSignin.signIn();
    if (response.type !== "success") {
      Alert.alert("Error", "Google sign-in failed. Please try again.");
      return;
    }
    const googleCredential = GoogleAuthProvider.credential(
      response.data.idToken,
    );
    const currentFirebaseUser = auth.currentUser;
    if (!currentFirebaseUser) {
      Alert.alert("Error", "Please login to link your Google account.");
      return;
    }
    await linkWithCredential(currentFirebaseUser, googleCredential);
    Alert.alert("Success", "Google account linked successfully.");
  };

  const linkWithFacebook = async () => {
    // Clear any existing FB session so linking always runs a fresh login (matches Google signOut pattern).
    LoginManager.logOut();

    let credential;

    if (Platform.OS === "ios") {
      const rawNonce = Math.random().toString(36).substring(2);
      const hashedNonce = sha256(rawNonce);
      const result = await LoginManager.logInWithPermissions(
        ["public_profile", "email"],
        "limited",
        hashedNonce,
      );
      if (result.isCancelled) {
        Alert.alert("Facebook", "Facebook login was cancelled.");
        throw new Error("FACEBOOK_LOGIN_CANCELLED");
      }

      // After returning from the Facebook app/Safari, the auth token is sometimes not ready on first read (device > simulator).
      let data = null as Awaited<
        ReturnType<typeof AuthenticationToken.getAuthenticationTokenIOS>
      >;
      for (let attempt = 0; attempt < 4; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 300 * attempt));
        }
        data = await AuthenticationToken.getAuthenticationTokenIOS();
        if (data?.authenticationToken) break;
      }
      if (!data?.authenticationToken) {
        throw new Error("FACEBOOK_NO_AUTH_TOKEN");
      }

      const provider = new OAuthProvider("facebook.com");
      credential = provider.credential({
        idToken: data.authenticationToken,
        rawNonce: rawNonce,
      });
    } else {
      const result = await LoginManager.logInWithPermissions([
        "public_profile",
        "email",
      ]);
      if (result.isCancelled) {
        Alert.alert("Facebook", "Facebook login was cancelled.");
        throw new Error("FACEBOOK_LOGIN_CANCELLED");
      }

      let data = await AccessToken.getCurrentAccessToken();
      if (!data?.accessToken) {
        for (let attempt = 1; attempt < 4 && !data?.accessToken; attempt++) {
          await new Promise((r) => setTimeout(r, 300 * attempt));
          data = await AccessToken.getCurrentAccessToken();
        }
      }
      if (!data?.accessToken) {
        throw new Error("FACEBOOK_NO_AUTH_TOKEN");
      }

      credential = FacebookAuthProvider.credential(data.accessToken);
    }

    const currentFirebaseUser = auth.currentUser;
    if (!currentFirebaseUser) {
      Alert.alert("Error", "Please login to link your Facebook account.");
      return;
    }
    await linkWithCredential(currentFirebaseUser, credential);
    Alert.alert("Success", "Facebook account linked successfully.");
  };

  const linkWithApple = async () => {
    Alert.alert("Coming Soon", "Apple account linking is not available yet.");
  };

  return (
    <Container>
      <Header>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <HeaderTitle>Linked Accounts</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>

      <MenuList>
        {menuOptions.map((option) => (
          <MenuItem
            key={option.label}
            onPress={() => handlePress(option.action)}
            disabled={isLinking}
          >
            <LeftContainer>
              <Ionicons
                name={option.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color="white"
              />
              <MenuText>{option.label}</MenuText>
            </LeftContainer>
            {option.isLinked ? (
              <Ionicons name="checkmark-circle" size={18} color="green" />
            ) : (
              <LinkButtonText>Link</LinkButtonText>
            )}
          </MenuItem>
        ))}
      </MenuList>
    </Container>
  );
};

const Container = styled.View`
  flex: 1;
  background-color: rgb(3, 16, 31);
  padding: 20px;
  padding-top: ${LINKED_ACCOUNTS_PADDING_TOP}px;
`;

const Header = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 30,
});

const HeaderTitle = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const MenuList = styled.View({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderRadius: 12,
  paddingVertical: 10,
});

const MenuItem = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 15,
  paddingHorizontal: 20,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: "rgba(255, 255, 255, 0.1)",
});

const LeftContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 15,
});

const MenuText = styled.Text({
  color: "white",
  fontSize: 16,
});

const LinkButtonText = styled.Text({
  color: "#00A2FF",
  fontSize: 14,
  fontWeight: "bold",
});

export default LinkedAccounts;
