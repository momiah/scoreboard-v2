import React, {
    useContext,
    useState,
    useEffect,
    useMemo,
    useCallback,
} from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
    Platform,
    Image,
} from "react-native";
import { LoginManager, AccessToken, AuthenticationToken } from "react-native-fbsdk-next";
import { FacebookAuthProvider, OAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import { sha256 } from "js-sha256";
import {
    CourtChampLogo,
    GoogleLogo,
    FacebookLogo,
    AppleLogo,
} from "../../assets";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, linkWithCredential } from "firebase/auth";
import { auth } from "../../services/firebase.config";
// @ts-expect-error - GOOGLE_WEB_CLIENT_ID is defined in the .env file
import { GOOGLE_WEB_CLIENT_ID } from "@env";
import { UserContext } from "../../context/UserContext";
import styled from "styled-components/native";
const platformAdjustedPaddingTop = Platform.OS === "ios" ? undefined : 60; // Adjust for iOS platform
import { useRoute, useNavigation } from "@react-navigation/native";
import { GameContext } from "../../context/GameContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MedalDisplay from "../../components/performance/MedalDisplay";
import Ionicons from "@expo/vector-icons/Ionicons";
import ProfileActivity from "../../components/Profiles/ProfileActivity";
import ProfilePerformance from "../../components/Profiles/ProfilePerformance";
import RankSuffix from "../../components/RankSuffix";
import { formatNumber } from "../../helpers/formatNumber";
import Icon from "react-native-ico-flags";
import { RankInformation } from "../../components/Modals/RankInformation";
import { fetchSignInMethodsForEmail } from "firebase/auth";

import { PopupContext } from "@/context/PopupContext";


const { width: screenWidth } = Dimensions.get("window");
const screenAdjustedMedalSize = screenWidth <= 400 ? 70 : 80;
const screenAdjustedStatFontSize = screenWidth <= 430 ? 15 : 18;
const screenAdjustedPaddingTop = screenWidth <= 450 ? 6 : undefined;
const platformAdjustedMarginTop = Platform.OS === "ios" ? 20 : 30; // Adjust for iOS platform
const AVATAR_SIZE = screenWidth <= 400 ? 70 : 80;

const LinkedAccounts: React.FC = (): JSX.Element => {
    const route = useRoute();
    const navigation = useNavigation();
    const {
        getUserById,
        getGlobalRank,
        currentUser,
        profileViewCount,
        getCountryRank,
    } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const [isLinking, setIsLinking] = useState(false);
    const { showPopup, setShowPopup, popupMessage, setPopupMessage } = useContext(PopupContext);
    const [existingLinkedAccounts, setExistingLinkedAccounts] = useState<string[]>([]);



    const loadExistingLinkedAccounts = async () => {
        const user = auth.currentUser;
        console.log("Loading existing linked accounts for user:", user);
        if (user) {
            await user.reload();

            const providers = user.providerData.map((p) => p.providerId);
            console.log("Setting providers:", providers);
            setExistingLinkedAccounts(providers);
        }
        setLoading(false);
    };
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const providers = user.providerData.map((p) => p.providerId);
                setExistingLinkedAccounts(providers);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);
    useEffect(() => {
        GoogleSignin.configure({
            webClientId: GOOGLE_WEB_CLIENT_ID,
        });
    }, []);

    const menuOptions = [
        { label: "Google", icon: "logo-google", action: "Google", isLinked: existingLinkedAccounts.includes("google.com") },
        { label: "Facebook", icon: "logo-facebook", action: "Facebook", isLinked: existingLinkedAccounts.includes("facebook.com") },
        { label: "Apple", icon: "logo-apple", action: "Apple", isLinked: existingLinkedAccounts.includes("apple.com") },
    ];

    const handlePress = async (action: string) => {
        setIsLinking(true);
        try {
            switch (action) {
                case "Google":
                    if (existingLinkedAccounts.includes("google.com")) {
                        setPopupMessage("Google account already linked.");
                        setShowPopup(true);
                        setIsLinking(false);
                        return;
                    }
                    await linkWithGoogle();
                    break;
                case "Facebook":
                    if (existingLinkedAccounts.includes("facebook.com")) {
                        setPopupMessage("Facebook account already linked.");
                        setShowPopup(true);
                        setIsLinking(false);
                        return;
                    }
                    await linkWithFacebook();
                    break;
                case "Apple":
                    await linkWithApple();
                    break;
            }
            loadExistingLinkedAccounts();

        } catch (error) {
            console.error("Error linking account:", error);
            setPopupMessage("Error linking account. Please try again.");
            setShowPopup(true);
        } finally {
            setIsLinking(false);
        }
    };

    const linkWithGoogle = async () => {
        await GoogleSignin.hasPlayServices();
        await GoogleSignin.signOut();
        const response = await GoogleSignin.signIn();
        if (response.type !== "success") {
            setPopupMessage("Google sign-in failed. Please try again.");
            setShowPopup(true);
            return;
        }
        const googleCredential = GoogleAuthProvider.credential(response.data.idToken);
        const currentFirebaseUser = auth.currentUser;
        if (!currentFirebaseUser) {
            setPopupMessage("Please login to link your Google account.");
            setShowPopup(true);
            return;
        }
        await linkWithCredential(currentFirebaseUser, googleCredential);
        setPopupMessage("Google account linked successfully.");
        setShowPopup(true);
        loadExistingLinkedAccounts();
    };

    const linkWithFacebook = async () => {
        let credential;

        if (Platform.OS === "ios") {
            const rawNonce = Math.random().toString(36).substring(2);
            const hashedNonce = sha256(rawNonce);
            const result = await LoginManager.logInWithPermissions(
                ["public_profile", "email"],
                "limited",
                hashedNonce,
            );
            if (result.isCancelled) return;

            const data = await AuthenticationToken.getAuthenticationTokenIOS();
            if (!data) throw new Error("No auth token");

            const provider = new OAuthProvider("facebook.com");
            credential = provider.credential({
                idToken: data.authenticationToken,
                rawNonce: rawNonce,
            });
        } else {
            const result = await LoginManager.logInWithPermissions(["public_profile", "email"]);
            if (result.isCancelled) return;

            const data = await AccessToken.getCurrentAccessToken();
            if (!data) throw new Error("No access token");

            credential = FacebookAuthProvider.credential(data.accessToken);
        }

        const currentFirebaseUser = auth.currentUser;
        if (!currentFirebaseUser) {
            setPopupMessage("Please login to link your Facebook account.");
            setShowPopup(true);
            return;
        }
        await linkWithCredential(currentFirebaseUser, credential);
        setPopupMessage("Facebook account linked successfully.");
        setShowPopup(true);
    };

    const linkWithApple = async () => {
        // await linkWithPopup(AppleAuthProvider.credential(token));
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
                                name={option.icon as keyof typeof Ionicons.glyphMap} as string
                                size={20}
                                color="white"
                            />
                            <MenuText
                                color="white"
                            >
                                {option.label}
                            </MenuText>
                        </LeftContainer>
                        {option.isLinked ? <Ionicons name="checkmark-circle" size={18} color="green" /> : <LinkButtonText>Link</LinkButtonText>}
                    </MenuItem>
                ))}
            </MenuList>
        </Container>
    );
};

// Additional styled components
const LoadingOverlay = styled.View`
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(3, 16, 31, 0.8);
      justify-content: center;
      align-items: center;
      z-index: 10;
    `;

const LoadingText = styled.Text`
      color: white;
      margin-top: 12px;
      font-size: 16px;
    `;

const styles = StyleSheet.create({
    blurContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

});

const LinkButtonText = styled.Text({
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
});

// Styled components
const Container = styled.View`
      flex: 1;
      background-color: rgb(3, 16, 31);
      padding: 20px;
      padding-top: ${platformAdjustedPaddingTop}px;
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

export default LinkedAccounts;
