import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Dimensions, FlatList, StyleSheet } from "react-native";
import type {
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import styled from "styled-components/native";

import {
  AchievementMedalsPage,
  Dots,
  Dot,
  NavButton,
  NavButtonText,
  NavRow,
} from "../ladder/HowToPlayFlow";
import { RevealContext } from "../ladder/HowToPlayReveal";
import SignupChrome from "./SignupChrome";
import CompetitionsPage from "./pages/CompetitionsPage";
import EveryGameCountsPage from "./pages/EveryGameCountsPage";
import RankPage from "./pages/RankPage";
import BrandPage from "./pages/BrandPage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface IntroPage {
  key: string;
  render: () => React.ReactNode;
}

interface SignupIntroPagerProps {
  onLogin: () => void;
  onJoin: () => void;
}

const PAGES: IntroPage[] = [
  { key: "brand", render: () => <BrandPage /> },
  { key: "competitions", render: () => <CompetitionsPage /> },
  { key: "compete", render: () => <EveryGameCountsPage /> },
  { key: "rank", render: () => <RankPage /> },
  { key: "medals", render: () => <AchievementMedalsPage /> },
];

const SignupIntroPager: React.FC<SignupIntroPagerProps> = ({
  onLogin,
  onJoin,
}) => {
  const listRef = useRef<FlatList<IntroPage>>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(index);
  indexRef.current = index;
  const lastIndex = PAGES.length - 1;

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, lastIndex));
      listRef.current?.scrollToIndex({ index: clamped, animated: true });
      setIndex(clamped);
    },
    [lastIndex],
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setIndex((current) => {
          if (current === 0) return current;
          const previous = current - 1;
          listRef.current?.scrollToIndex({ index: previous, animated: true });
          return previous;
        });
        return indexRef.current > 0;
      },
    );
    return () => subscription.remove();
  }, []);

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (page !== index) setIndex(page);
  };

  const renderItem = ({
    item,
    index: pageIndex,
  }: ListRenderItemInfo<IntroPage>) => (
    <RevealContext.Provider value={pageIndex === index}>
      <Page>{item.render()}</Page>
    </RevealContext.Provider>
  );

  const onBrand = index === 0;

  return (
    <SignupChrome>
      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        extraData={index}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, itemIndex) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * itemIndex,
          index: itemIndex,
        })}
        style={styles.list}
      />

      {onBrand ? null : (
        <Dots>
          {PAGES.map((page, pageIndex) => (
            <Dot key={page.key} active={pageIndex === index} />
          ))}
        </Dots>
      )}

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
    </SignupChrome>
  );
};

const Page = styled.View({
  width: SCREEN_WIDTH,
  flex: 1,
});

const styles = StyleSheet.create({
  list: { flex: 1 },
});

export default SignupIntroPager;
