import React, { useCallback, useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import styled from "styled-components/native";

import {
  AchievementMedalsPage,
  Dot,
  Dots,
  NavButton,
  NavButtonText,
  NavRow,
} from "../ladder/HowToPlayFlow";
import FlowHeader from "./FlowHeader";
import BrandPage from "./pages/BrandPage";
import CompetitionsPage from "./pages/CompetitionsPage";
import EveryGameCountsPage from "./pages/EveryGameCountsPage";
import RankPage from "./pages/RankPage";

interface IntroPage {
  key: string;
  render: () => React.ReactNode;
}

const PAGES: IntroPage[] = [
  { key: "brand", render: () => <BrandPage /> },
  { key: "competitions", render: () => <CompetitionsPage /> },
  { key: "compete", render: () => <EveryGameCountsPage /> },
  { key: "rank", render: () => <RankPage /> },
  { key: "medals", render: () => <AchievementMedalsPage /> },
];

export const INTRO_PAGE_COUNT = PAGES.length;

interface SignupIntroPagerProps {
  index: number;
  onIndexChange: (index: number) => void;
  onLogin: () => void;
  onSkip: () => void;
  onJoin: () => void;
}

const SignupIntroPager: React.FC<SignupIntroPagerProps> = ({
  index,
  onIndexChange,
  onLogin,
  onSkip,
  onJoin,
}) => {
  const lastIndex = PAGES.length - 1;
  const onBrand = index === 0;

  const goTo = useCallback(
    (next: number) => {
      onIndexChange(Math.max(0, Math.min(next, lastIndex)));
    },
    [lastIndex, onIndexChange],
  );

  return (
    <>
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
          onRightPress={onSkip}
          testIDPrefix="signup-intro-header"
        />
      )}

      <PageFade key={PAGES[index].key}>{PAGES[index].render()}</PageFade>

      <Dots>
        {PAGES.map((page, pageIndex) => (
          <Dot key={page.key} active={pageIndex === index} />
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

        {onBrand ? (
          <NavButton
            primary
            onPress={() => goTo(1)}
            testID="signup-intro-get-started"
          >
            <NavButtonText>Get started</NavButtonText>
          </NavButton>
        ) : index < lastIndex ? (
          <NavButton
            primary
            onPress={() => goTo(index + 1)}
            testID="signup-intro-next"
          >
            <NavButtonText>Next</NavButtonText>
          </NavButton>
        ) : (
          <NavButton primary onPress={onJoin} testID="signup-intro-join">
            <NavButtonText>Join now</NavButtonText>
          </NavButton>
        )}
      </NavRow>
    </>
  );
};

/** Only the current page is mounted, so changing page can never leave the pager out of step with its state. */
const PageFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      style={[
        styles.page,
        {
          opacity: progress,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
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

const styles = StyleSheet.create({
  page: { flex: 1 },
});

export default SignupIntroPager;
