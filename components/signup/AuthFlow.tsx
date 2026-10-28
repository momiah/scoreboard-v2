import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated, BackHandler, StyleSheet } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UserContext } from "../../context/UserContext";
import { logLoginEvent } from "../../screens/Authentication/loginAuth";
import type { SocialSignupParams } from "../../screens/Authentication/socialAuth";
import { useFullScreenFlow } from "./FullScreenFlowContext";
import LoginStep from "./LoginStep";
import SignupAccountStep from "./SignupAccountStep";
import SignupChrome from "./SignupChrome";
import SignupIntroPager, { INTRO_PAGE_COUNT } from "./SignupIntroPager";
import SignupProfileStep from "./SignupProfileStep";
import SignupWelcomeStep from "./SignupWelcomeStep";

type Step = "intro" | "login" | "account" | "profile" | "welcome";

interface Draft {
  email: string;
  password: string;
  social?: SocialSignupParams;
  firstName: string;
  requiresEmailVerification: boolean;
}

interface FlowNavigation {
  reset: (state: { index: number; routes: { name: string }[] }) => void;
  setOptions: (options: { gestureEnabled: boolean }) => void;
  getParent: () => { navigate: (screen: string) => void } | undefined;
}

interface AuthFlowProps {
  initialStep?: "intro" | "account";
}

const LAST_INTRO_PAGE = INTRO_PAGE_COUNT - 1;

const emptyDraft: Draft = {
  email: "",
  password: "",
  firstName: "",
  requiresEmailVerification: false,
};

/** Fades each step in over the shared backdrop, so moving between steps never flashes. */
const StepFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      style={[
        styles.step,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * One flow for logging in and signing up. The brand page and the login form sit
 * inside the normal app chrome (tab bar visible); every other step goes full screen.
 */
const AuthFlow: React.FC<AuthFlowProps> = ({ initialStep = "intro" }) => {
  const navigation = useNavigation() as unknown as FlowNavigation;
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { getUserById, setCurrentUser } = useContext(UserContext);

  const [step, setStep] = useState<Step>(initialStep);
  const [introIndex, setIntroIndex] = useState(
    initialStep === "account" ? LAST_INTRO_PAGE : 0,
  );
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const accountBack = useRef<"intro" | "login">("intro");

  const fullScreen =
    step === "account" ||
    step === "profile" ||
    step === "welcome" ||
    (step === "intro" && introIndex > 0);
  useFullScreenFlow(fullScreen && isFocused);

  const atBrand = step === "intro" && introIndex === 0;
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: atBrand });
  }, [atBrand, navigation]);

  const goAccount = useCallback((from: "intro" | "login") => {
    accountBack.current = from;
    setStep("account");
  }, []);

  const leaveAccount = useCallback(() => {
    if (accountBack.current === "login") {
      setStep("login");
      return;
    }
    setIntroIndex(LAST_INTRO_PAGE);
    setStep("intro");
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (step === "welcome") return true;
        if (step === "profile") {
          setStep("account");
          return true;
        }
        if (step === "account") {
          leaveAccount();
          return true;
        }
        if (step === "login") {
          setIntroIndex(0);
          setStep("intro");
          return true;
        }
        if (introIndex > 0) {
          setIntroIndex(introIndex - 1);
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [step, introIndex, leaveAccount]);

  const exitToApp = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  }, [navigation]);

  const finishLogin = (
    profile: Record<string, unknown> | null,
    method?: string,
  ) => {
    if (profile) setCurrentUser(profile);
    if (method) {
      logLoginEvent(method);
    }
    exitToApp();
  };

  const startSocialSignup = (params: SocialSignupParams) => {
    setDraft({
      email: params.userEmail,
      password: "",
      social: params,
      firstName: params.userName,
      requiresEmailVerification: false,
    });
    setStep("profile");
  };

  const createLeague = () => {
    const tabs = navigation.getParent();
    exitToApp();
    tabs?.navigate("Competitions");
  };

  const renderStep = () => {
    switch (step) {
      case "login":
        return (
          <LoginStep
            getUserById={getUserById}
            onBack={() => {
              setIntroIndex(0);
              setStep("intro");
            }}
            onCreateAccount={() => goAccount("login")}
            onLoggedIn={finishLogin}
            onSocialNeedsSignup={startSocialSignup}
          />
        );
      case "account":
        return (
          <SignupAccountStep
            getUserById={getUserById}
            bottomInset={insets.bottom}
            onBack={leaveAccount}
            onLogin={() => setStep("login")}
            onEmailAccepted={(email, password) => {
              setDraft({
                ...emptyDraft,
                email,
                password,
              });
              setStep("profile");
            }}
            onSocialExisting={finishLogin}
            onSocialNeedsSignup={startSocialSignup}
          />
        );
      case "profile":
        return (
          <SignupProfileStep
            email={draft.email}
            password={draft.password}
            socialId={draft.social?.userId}
            socialProvider={draft.social?.provider}
            initialFirstName={draft.social?.userName}
            initialLastName={draft.social?.userLastName}
            setCurrentUser={setCurrentUser}
            onBack={() => setStep("account")}
            onCreated={(requiresEmailVerification, firstName) => {
              setDraft((current) => ({
                ...current,
                firstName,
                requiresEmailVerification,
              }));
              setStep("welcome");
            }}
          />
        );
      case "welcome":
        return (
          <SignupWelcomeStep
            firstName={draft.firstName}
            requiresEmailVerification={draft.requiresEmailVerification}
            onExplore={exitToApp}
            onCreateLeague={createLeague}
          />
        );
      default:
        return (
          <SignupIntroPager
            index={introIndex}
            onIndexChange={setIntroIndex}
            onLogin={() => setStep("login")}
            onSkip={() => goAccount("intro")}
            onJoin={() => goAccount("intro")}
          />
        );
    }
  };

  const bottomPad =
    fullScreen && step !== "account" ? Math.max(insets.bottom - 20, 0) : 0;

  return (
    <SignupChrome>
      <StepFade key={step}>
        <FlowFrame style={{ paddingTop: insets.top, paddingBottom: bottomPad }}>
          {renderStep()}
        </FlowFrame>
      </StepFade>
    </SignupChrome>
  );
};

const FlowFrame: React.FC<{
  style: { paddingTop: number; paddingBottom: number };
  children: React.ReactNode;
}> = ({ style, children }) => (
  <Animated.View style={[styles.step, style]}>{children}</Animated.View>
);

const styles = StyleSheet.create({
  step: { flex: 1 },
});

export default AuthFlow;
