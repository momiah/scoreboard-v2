import React, { useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";
import type { UserProfile } from "@shared/types";

import {
  NavButton,
  NavButtonText,
  NavRow,
  PagerDots,
  PagerList,
  usePager,
  type PagerPage,
} from "../ladder/HowToPlayPager";
import type { SocialSignupParams } from "../../screens/Authentication/socialAuth";
import FlowHeader from "./FlowHeader";
import BrandPage from "./pages/BrandPage";
import CompetitionsPage from "./pages/CompetitionsPage";
import EveryGameCountsPage from "./pages/EveryGameCountsPage";
import RankPage from "./pages/RankPage";
import SignupAccountStep from "./SignupAccountStep";
import SignupChrome from "./SignupChrome";
import SignupProfileStep from "./SignupProfileStep";
import AccountCreatedStep from "./AccountCreatedStep";
import type { ProfileLookup } from "./useSocialAuth";

const PAGES: PagerPage[] = [
  { key: "brand", render: () => <BrandPage /> },
  { key: "competitions", render: () => <CompetitionsPage /> },
  { key: "compete", render: () => <EveryGameCountsPage /> },
  { key: "rank", render: () => <RankPage /> },
];

type Step = "intro" | "account" | "profile" | "welcome";

interface Draft {
  email: string;
  password: string;
  social?: SocialSignupParams;
  firstName: string;
  requiresEmailVerification: boolean;
}

const emptyDraft: Draft = {
  email: "",
  password: "",
  firstName: "",
  requiresEmailVerification: false,
};

const socialDraft = (params: SocialSignupParams): Draft => ({
  ...emptyDraft,
  email: params.userEmail,
  social: params,
  firstName: params.userName,
});

interface SignupIntroFlowProps {
  getUserById: ProfileLookup;
  setCurrentUser: (user: UserProfile) => void;
  onLogin: () => void;
  onSignedIn: (profile: Record<string, unknown>, method: string) => void;
  onExplore: () => void;
  onCreateLeague: () => void;
  /** Opens straight at the profile step for a new Google / Apple player (from Login). */
  initialSocialSignup?: SocialSignupParams;
}

/** The intro pages, then the account, profile and welcome steps. */
const SignupIntroFlow: React.FC<SignupIntroFlowProps> = ({
  getUserById,
  setCurrentUser,
  onLogin,
  onSignedIn,
  onExplore,
  onCreateLeague,
  initialSocialSignup,
}) => {
  const pager = usePager(PAGES.length);
  const { index, lastIndex, goTo } = pager;
  const [step, setStep] = useState<Step>(
    initialSocialSignup ? "profile" : "intro",
  );
  const [draft, setDraft] = useState<Draft>(() =>
    initialSocialSignup ? socialDraft(initialSocialSignup) : emptyDraft,
  );
  const restoreIndex = useRef(0);

  const openAccount = () => {
    restoreIndex.current = index;
    setStep("account");
  };

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
          setStep("intro");
          return true;
        }
        if (index > 0) {
          goTo(index - 1);
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [step, index, goTo]);

  const startSocialSignup = (params: SocialSignupParams) => {
    setDraft(socialDraft(params));
    setStep("profile");
  };

  if (step !== "intro") {
    return (
      <SignupChrome>
        {step === "account" ? (
          <SignupAccountStep
            getUserById={getUserById}
            onBack={() => setStep("intro")}
            onLogin={onLogin}
            onEmailAccepted={(email, password) => {
              setDraft({ ...emptyDraft, email, password });
              setStep("profile");
            }}
            onSocialExisting={onSignedIn}
            onSocialNeedsSignup={startSocialSignup}
          />
        ) : null}
        {step === "profile" ? (
          <SignupProfileStep
            email={draft.email}
            password={draft.password}
            socialId={draft.social?.userId}
            socialProvider={draft.social?.provider}
            socialIsNewUser={draft.social?.isNewUser}
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
        ) : null}
        {step === "welcome" ? (
          <AccountCreatedStep
            firstName={draft.firstName}
            requiresEmailVerification={draft.requiresEmailVerification}
            onExplore={onExplore}
            onCreateLeague={onCreateLeague}
          />
        ) : null}
      </SignupChrome>
    );
  }

  const onBrand = index === 0;

  return (
    <SignupChrome>
      {onBrand ? (
        <FlowHeader
          rightLabel="Skip"
          onRightPress={openAccount}
          testIDPrefix="signup-intro-header"
        />
      ) : (
        <FlowHeader
          onBack={() => goTo(index - 1)}
          rightLabel="Skip"
          onRightPress={openAccount}
          testIDPrefix="signup-intro-header"
        />
      )}

      <PagerList
        pager={pager}
        pages={PAGES}
        initialIndex={restoreIndex.current}
      />
      <PagerDots pages={PAGES} index={index} testID="signup-intro-dots" />

      <NavRow>
        {onBrand ? (
          <NavButton onPress={onLogin} testID="signup-intro-login">
            <NavButtonText>Log in</NavButtonText>
          </NavButton>
        ) : (
          <NavButton onPress={() => goTo(index - 1)} testID="signup-intro-back">
            <NavButtonText>Back</NavButtonText>
          </NavButton>
        )}

        {index < lastIndex ? (
          <NavButton
            primary
            onPress={() => goTo(index + 1)}
            testID="signup-intro-next"
          >
            <NavButtonText>{onBrand ? "Get started" : "Next"}</NavButtonText>
          </NavButton>
        ) : (
          <NavButton primary onPress={openAccount} testID="signup-intro-join">
            <NavButtonText>{"I'm ready"}</NavButtonText>
          </NavButton>
        )}
      </NavRow>
    </SignupChrome>
  );
};

export default SignupIntroFlow;
