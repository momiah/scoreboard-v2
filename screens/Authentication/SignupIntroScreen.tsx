import React, { useContext, useEffect, useState } from "react";
import { BackHandler } from "react-native";
import { useNavigation } from "@react-navigation/native";

import SignupAccountStep from "../../components/signup/SignupAccountStep";
import SignupIntroPager from "../../components/signup/SignupIntroPager";
import SignupProfileStep from "../../components/signup/SignupProfileStep";
import SignupWelcomeStep from "../../components/signup/SignupWelcomeStep";
import { UserContext } from "../../context/UserContext";
import type { SocialSignupParams } from "./socialAuth";

type Step = "intro" | "account" | "profile" | "welcome";

interface Draft {
  email: string;
  password: string;
  social?: SocialSignupParams;
  requiresEmailVerification: boolean;
}

const emptyDraft: Draft = {
  email: "",
  password: "",
  requiresEmailVerification: false,
};

interface IntroNavigation {
  navigate: (screen: string) => void;
  reset: (state: { index: number; routes: { name: string }[] }) => void;
  getParent: () => { navigate: (screen: string) => void } | undefined;
}

const SignupIntroScreen: React.FC = () => {
  const navigation = useNavigation() as IntroNavigation;
  const { getUserById, setCurrentUser } = useContext(UserContext);
  const [step, setStep] = useState<Step>("intro");
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (step === "profile" || step === "account") {
          setStep(step === "profile" ? "account" : "intro");
          return true;
        }
        if (step === "welcome") return true;
        return false;
      },
    );
    return () => subscription.remove();
  }, [step]);

  const goToLogin = () => {
    navigation.navigate("Login");
  };

  const enterApp = () => {
    navigation.reset({ index: 0, routes: [{ name: "HomeMain" }] });
  };

  const createLeague = () => {
    const parent = navigation.getParent();
    navigation.reset({ index: 0, routes: [{ name: "HomeMain" }] });
    parent?.navigate("Competitions");
  };

  if (step === "account") {
    return (
      <SignupAccountStep
        getUserById={getUserById}
        onLogin={goToLogin}
        onEmailAccepted={(email, password) => {
          setDraft({
            email,
            password,
            social: undefined,
            requiresEmailVerification: false,
          });
          setStep("profile");
        }}
        onSocialExisting={(profile) => {
          setCurrentUser(profile);
          enterApp();
        }}
        onSocialNeedsSignup={(params) => {
          setDraft({
            email: params.userEmail,
            password: "",
            social: params,
            requiresEmailVerification: false,
          });
          setStep("profile");
        }}
      />
    );
  }

  if (step === "profile") {
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
        onCreated={(requiresEmailVerification) => {
          setDraft((current) => ({ ...current, requiresEmailVerification }));
          setStep("welcome");
        }}
      />
    );
  }

  if (step === "welcome") {
    return (
      <SignupWelcomeStep
        requiresEmailVerification={draft.requiresEmailVerification}
        onExplore={enterApp}
        onCreateLeague={createLeague}
      />
    );
  }

  return (
    <SignupIntroPager onLogin={goToLogin} onJoin={() => setStep("account")} />
  );
};

export default SignupIntroScreen;
