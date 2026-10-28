import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, useWindowDimensions } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import type {
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import styled from "styled-components/native";

import {
  AchievementMedalsPage,
  Dot,
  Dots,
  NavButton,
  NavButtonText,
  NavRow,
} from "../ladder/HowToPlayFlow";
import { RevealContext } from "../ladder/HowToPlayReveal";
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
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<IntroPage>>(null);
  const [listHeight, setListHeight] = useState(0);
  const lastIndex = PAGES.length - 1;
  const onBrand = index === 0;

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, lastIndex));
      listRef.current?.scrollToIndex({ index: clamped, animated: true });
      onIndexChange(clamped);
    },
    [lastIndex, onIndexChange],
  );

  useEffect(() => {
    listRef.current?.scrollToIndex({ index, animated: false });
  }, [width, index]);

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    if (page !== index) onIndexChange(page);
  };

  const renderItem = ({
    item,
    index: pageIndex,
  }: ListRenderItemInfo<IntroPage>) => (
    <RevealContext.Provider value={pageIndex === index}>
      <Page style={{ width, height: listHeight }}>{item.render()}</Page>
    </RevealContext.Provider>
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
        getItemLayout={(_, itemIndex) => ({
          length: width,
          offset: width * itemIndex,
          index: itemIndex,
        })}
        style={styles.list}
        onLayout={(event: LayoutChangeEvent) =>
          setListHeight(event.nativeEvent.layout.height)
        }
      />

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

const Page = styled.View({});

const styles = StyleSheet.create({
  list: { flex: 1 },
});

export default SignupIntroPager;
