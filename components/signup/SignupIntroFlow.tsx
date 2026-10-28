import React, { useEffect, useRef, useState } from "react";
import { BackHandler, Dimensions, FlatList } from "react-native";
import type {
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import styled from "styled-components/native";
import type { UserProfile } from "@shared/types";

import {
  Dot,
  Dots,
  HowToPlayButton as NavButton,
  HowToPlayButtonText as NavButtonText,
  NavRow,
} from "../ladder/HowToPlayFlow";
import { RevealContext } from "../ladder/HowToPlayReveal";
import type { SocialSignupParams } from "../../screens/Authentication/socialAuth";
import FlowHeader from "./FlowHeader";
import BrandPage from "./pages/BrandPage";
import CompetitionsPage from "./pages/CompetitionsPage";
import EveryGameCountsPage from "./pages/EveryGameCountsPage";
import RankPage from "./pages/RankPage";
import SignupAccountStep from "./SignupAccountStep";
import SignupChrome from "./SignupChrome";
import SignupProfileStep from "./SignupProfileStep";
import SignupWelcomeStep from "./SignupWelcomeStep";
import type { ProfileLookup } from "./useSocialAuth";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface IntroPage {
  key: string;
  render: () => React.ReactNode;
}

const PAGES: IntroPage[] = [
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

interface SignupIntroFlowProps {
  getUserById: ProfileLookup;
  setCurrentUser: (user: UserProfile) => void;
  onLogin: () => void;
  onSignedIn: (profile: Record<string, unknown>, method: string) => void;
  onExplore: () => void;
  onCreateLeague: () => void;
}

/**
 * Same shape as HowToPlayFlow: one screen inside the stack (so the tab bar stays
 * put), the shared backdrop, a paging FlatList of pages, dots and Back / Next.
 * After the last page it carries on into the account, profile and welcome steps.
 */
const SignupIntroFlow: React.FC<SignupIntroFlowProps> = ({
  getUserById,
  setCurrentUser,
  onLogin,
  onSignedIn,
  onExplore,
  onCreateLeague,
}) => {
  const listRef = useRef<FlatList<IntroPage>>(null);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>("intro");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const lastIndex = PAGES.length - 1;

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(next, lastIndex));
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
    setIndex(clamped);
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (page !== index) setIndex(page);
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
          listRef.current?.scrollToIndex({ index: index - 1, animated: true });
          setIndex(index - 1);
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [step, index]);

  const startSocialSignup = (params: SocialSignupParams) => {
    setDraft({
      ...emptyDraft,
      email: params.userEmail,
      social: params,
      firstName: params.userName,
    });
    setStep("profile");
  };

  const renderItem = ({
    item,
    index: pageIndex,
  }: ListRenderItemInfo<IntroPage>) => (
    <RevealContext.Provider value={pageIndex === index}>
      <PageContainer>{item.render()}</PageContainer>
    </RevealContext.Provider>
  );

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
          <SignupWelcomeStep
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
          rightLabel="Log in"
          onRightPress={onLogin}
          testIDPrefix="signup-intro-header"
        />
      ) : (
        <FlowHeader
          onBack={() => goTo(index - 1)}
          rightLabel="Skip"
          onRightPress={() => setStep("account")}
          testIDPrefix="signup-intro-header"
        />
      )}

      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        extraData={index}
        horizontal
        pagingEnabled
        initialScrollIndex={index}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * i,
          index: i,
        })}
      />

      <Dots testID="signup-intro-dots">
        {PAGES.map((page, i) => (
          <Dot key={page.key} active={i === index} />
        ))}
      </Dots>

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
          <NavButton
            primary
            onPress={() => setStep("account")}
            testID="signup-intro-join"
          >
            <NavButtonText>Join now</NavButtonText>
          </NavButton>
        )}
      </NavRow>
    </SignupChrome>
  );
};

const PageContainer = styled.View({
  width: SCREEN_WIDTH,
  flex: 1,
});

export default SignupIntroFlow;
