import React, { useCallback, useRef, useState } from "react";
import { Dimensions, FlatList } from "react-native";
import type {
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import styled from "styled-components/native";

import { RevealContext } from "./HowToPlayReveal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface PagerPage {
  key: string;
  render: () => React.ReactNode;
}

/** Page index and navigation for a swipeable, button-driven run of pages. */
export const usePager = (pageCount: number) => {
  const listRef = useRef<FlatList<PagerPage>>(null);
  const [index, setIndex] = useState(0);
  const lastIndex = pageCount - 1;

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, lastIndex));
      listRef.current?.scrollToIndex({ index: clamped, animated: true });
      setIndex(clamped);
    },
    [lastIndex],
  );

  return { listRef, index, setIndex, lastIndex, goTo };
};

export type Pager = ReturnType<typeof usePager>;

const getItemLayout = (_: unknown, i: number) => ({
  length: SCREEN_WIDTH,
  offset: SCREEN_WIDTH * i,
  index: i,
});

const keyExtractor = (page: PagerPage) => page.key;

interface PagerListProps {
  pager: Pager;
  pages: PagerPage[];
  /**
   * Fixed for the list's lifetime: changing initialScrollIndex on a mounted
   * FlatList changes which cells it keeps rendered and leaves later pages blank.
   */
  initialIndex?: number;
}

/** The pages, one screen wide each. Only the page on screen runs its animations. */
export const PagerList: React.FC<PagerListProps> = ({
  pager,
  pages,
  initialIndex = 0,
}) => {
  const { listRef, index, setIndex } = pager;

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setIndex((current) => (page === current ? current : page));
    },
    [setIndex],
  );

  const renderItem = useCallback(
    ({ item, index: pageIndex }: ListRenderItemInfo<PagerPage>) => (
      <RevealContext.Provider value={pageIndex === index}>
        <PageContainer>{item.render()}</PageContainer>
      </RevealContext.Provider>
    ),
    [index],
  );

  return (
    <FlatList
      ref={listRef}
      data={pages}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      extraData={index}
      horizontal
      pagingEnabled
      initialScrollIndex={initialIndex}
      initialNumToRender={pages.length}
      windowSize={pages.length * 2 + 1}
      removeClippedSubviews={false}
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={onMomentumEnd}
      getItemLayout={getItemLayout}
    />
  );
};

export const PagerDots: React.FC<{
  pages: PagerPage[];
  index: number;
  testID?: string;
}> = ({ pages, index, testID }) => (
  <Dots testID={testID}>
    {pages.map((page, i) => (
      <Dot key={page.key} active={i === index} />
    ))}
  </Dots>
);

const PageContainer = styled.View({
  width: SCREEN_WIDTH,
  flex: 1,
});

const Dots = styled.View({
  flexDirection: "row",
  justifyContent: "center",
  gap: 8,
  paddingTop: 8,
  paddingBottom: 32,
});

const Dot = styled.View<{ active: boolean }>(
  ({ active }: { active: boolean }) => ({
    width: active ? 22 : 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: active ? "#00A2FF" : "#33445a",
  }),
);

export const NavRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingBottom: 30,
  gap: 12,
});

export const NavButton = styled.TouchableOpacity<{
  primary?: boolean;
  isHidden?: boolean;
  disabled?: boolean;
  participant?: boolean;
}>(
  ({
    primary,
    isHidden,
    participant,
  }: {
    primary?: boolean;
    isHidden?: boolean;
    participant?: boolean;
  }) => ({
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 15,
    borderRadius: 12,
    opacity: isHidden ? 0 : 1,
    backgroundColor: participant ? "#2b3440" : primary ? "#00A2FF" : "#1e2b3d",
  }),
);

export const NavButtonText = styled.Text<{ disabled?: boolean }>(
  ({ disabled }: { disabled?: boolean }) => ({
    color: disabled ? "#7f97a8" : "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  }),
);
