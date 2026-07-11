import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  Dimensions,
  ScrollView,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedProps,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

import LineTabs from "../../LineTabs";
import { BracketGameCard, BracketSectionLabel } from "./BracketAtoms";
import GameGlow from "@/components/GameCardGlow";
import {
  useBracketScrollToGame,
  findGamePosition,
} from "./useBracketScrollToGame";
import { Fixtures, Game } from "@shared/types";
import { roundLabel, isShellGame } from "@shared/helpers";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isSmallScreen = SCREEN_WIDTH <= 430;

const COLUMN_WIDTH = SCREEN_WIDTH * 0.9;
const COLUMN_GUTTER = 35;
const PAGE_STRIDE = COLUMN_WIDTH + COLUMN_GUTTER;
const TREE_VERTICAL_PADDING = 20;
const CONNECTOR_STROKE = "rgba(255, 255, 255, 0.25)";
const CONNECTOR_STROKE_WIDTH = 1;
const FALLBACK_CARD_HEIGHT = 210;
const CARD_GAP = 16;
const SCROLL_TO_TOP_OFFSET = 40;

type BracketViewMode = "tree" | "list";

interface BracketTreeProps {
  fixtures: Fixtures[];
  tournamentType: string;
  onGamePress: (game: Game) => void;
  scrollToGameId?: string;
  glowColor?: string;
}

interface TreeRound {
  round: number;
  games: Game[];
}

const headerForRound = (games: Game[]): string => {
  const playableGames = games.filter((g) => !g.isThirdPlacePlayoff).length;
  return roundLabel(playableGames * 2);
};

const perGameLabel = (
  game: Game,
  roundIndex: number,
  totalRounds: number,
): string | null => {
  if (game.isThirdPlacePlayoff) return "3rd/4th Playoff";
  if (roundIndex === totalRounds - 1) return "Final";
  return null;
};

// Blend two layouts (targets for adjacent active rounds) by scroll fraction.
// Runs in a worklet; both cards and connectors use it so lines stay attached.
const blendY = (
  layoutsByActive: number[][][],
  roundIndex: number,
  gameIndex: number,
  scrollValue: number,
): number => {
  "worklet";
  const lastActive = layoutsByActive.length - 1;
  const rawActive = scrollValue / PAGE_STRIDE;
  const lower = Math.max(0, Math.min(Math.floor(rawActive), lastActive));
  const upper = Math.max(0, Math.min(Math.ceil(rawActive), lastActive));
  const frac = rawActive - lower;
  const lowerY = layoutsByActive[lower][roundIndex][gameIndex];
  const upperY = layoutsByActive[upper][roundIndex][gameIndex];
  return lowerY + (upperY - lowerY) * frac;
};

interface ConnectorProps {
  fromXValue: number;
  toXValue: number;
  fromRound: number;
  fromGame: number;
  toRound: number;
  toGame: number;
  layoutsByActive: number[][][];
  scrollX: Animated.SharedValue<number>;
}

const AnimatedConnector = ({
  fromXValue,
  toXValue,
  fromRound,
  fromGame,
  toRound,
  toGame,
  layoutsByActive,
  scrollX,
}: ConnectorProps) => {
  const animatedProps = useAnimatedProps(() => {
    "worklet";
    const fromY = blendY(layoutsByActive, fromRound, fromGame, scrollX.value);
    const toY = blendY(layoutsByActive, toRound, toGame, scrollX.value);
    const midX = (fromXValue + toXValue) / 2;
    return {
      d: `M ${fromXValue} ${fromY} H ${midX} V ${toY} H ${toXValue}`,
    };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      stroke={CONNECTOR_STROKE}
      strokeWidth={CONNECTOR_STROKE_WIDTH}
      fill="none"
    />
  );
};

interface CardProps {
  game: Game;
  label: string | null;
  tournamentType: string;
  leftX: number;
  cardWidth: number;
  cardHeight: number;
  roundIndex: number;
  gameIndex: number;
  layoutsByActive: number[][][];
  scrollX: Animated.SharedValue<number>;
  onLayout?: (event: LayoutChangeEvent) => void;
  onPress: () => void;
  isHighlighted: boolean;
  glowAnim: unknown;
  glowColor: string;
}

const AnimatedBracketCard = ({
  game,
  label,
  tournamentType,
  leftX,
  cardWidth,
  cardHeight,
  roundIndex,
  gameIndex,
  layoutsByActive,
  scrollX,
  onLayout,
  onPress,
  isHighlighted,
  glowAnim,
  glowColor,
}: CardProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    const centerY = blendY(
      layoutsByActive,
      roundIndex,
      gameIndex,
      scrollX.value,
    );
    return { transform: [{ translateY: centerY - cardHeight / 2 }] };
  });

  return (
    <Animated.View
      onLayout={onLayout}
      style={[cardBaseStyle, { left: leftX, width: cardWidth }, animatedStyle]}
    >
      <BracketGameCard
        game={game}
        label={label}
        tournamentType={tournamentType}
        shell={isShellGame(game)}
        onPress={onPress}
      />
      {isHighlighted && (
        <GameGlow glowAnim={glowAnim as never} color={glowColor} />
      )}
    </Animated.View>
  );
};

const BracketTree = ({
  fixtures,
  tournamentType,
  onGamePress,
  scrollToGameId,
  glowColor = "#00A2FF",
}: BracketTreeProps) => {
  const treeRounds: TreeRound[] = useMemo(
    () =>
      fixtures.map((round) => ({
        round: round.round,
        games: round.games.filter((g) => !g.isThirdPlacePlayoff),
      })),
    [fixtures],
  );

  const playoffGame = useMemo(() => {
    for (const round of fixtures) {
      const playoff = round.games.find((g) => g.isThirdPlacePlayoff);
      if (playoff) return playoff;
    }
    return null;
  }, [fixtures]);

  const initialRoundIndex = useMemo(() => {
    const { roundIndex } = findGamePosition(treeRounds, scrollToGameId);
    if (roundIndex !== -1) return roundIndex;
    if (playoffGame?.gameId === scrollToGameId) return treeRounds.length - 1;
    return 0;
  }, []);

  const [activeRoundIndex, setActiveRoundIndex] = useState(initialRoundIndex);
  const [viewMode, setViewMode] = useState<BracketViewMode>("tree");
  const [measuredCardHeight, setMeasuredCardHeight] = useState<number | null>(
    null,
  );
  const horizontalScrollRef = useRef<Animated.ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);
  const programmaticScrollRef = useRef(false);
  const scrollX = useSharedValue(initialRoundIndex * PAGE_STRIDE);
  // Captured once so the ScrollView's contentOffset prop never re-applies on
  // re-render (which would fight scrollTo and cause the double/reset tab jumps).
  const initialContentOffset = useRef({
    x: initialRoundIndex * PAGE_STRIDE,
    y: 0,
  }).current;

  const cardHeight = measuredCardHeight ?? FALLBACK_CARD_HEIGHT;
  const rowStride = cardHeight + CARD_GAP;
  const roundCount = treeRounds.length;

  const handleCardLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height > 0 && Math.abs(height - cardHeight) > 1) {
        setMeasuredCardHeight(height);
      }
    },
    [cardHeight],
  );

  const tabs = useMemo(
    () =>
      treeRounds.map((round, index) => ({
        key: String(index),
        label: headerForRound(round.games),
      })),
    [treeRounds],
  );

  const maxGamesInAnyRound = useMemo(
    () => Math.max(...treeRounds.map((r) => r.games.length), 1),
    [treeRounds],
  );

  const spreadCenters = useMemo(() => {
    const centers: number[][] = [];
    treeRounds.forEach((round, roundIndex) => {
      centers[roundIndex] = [];
      round.games.forEach((_, gameIndex) => {
        if (roundIndex === 0) {
          centers[roundIndex][gameIndex] =
            TREE_VERTICAL_PADDING + gameIndex * rowStride + cardHeight / 2;
        } else {
          const feederTop = centers[roundIndex - 1][gameIndex * 2];
          const feederBottom = centers[roundIndex - 1][gameIndex * 2 + 1];
          centers[roundIndex][gameIndex] = (feederTop + feederBottom) / 2;
        }
      });
    });
    return centers;
  }, [treeRounds, rowStride, cardHeight]);

  // Precompute the target layout for every possible active round. The worklet
  // blends between two of these by scroll position.
  const layoutsByActive = useMemo(() => {
    const all: number[][][] = [];
    for (let active = 0; active < roundCount; active++) {
      const centers: number[][] = [];
      treeRounds.forEach((round, roundIndex) => {
        centers[roundIndex] = [];
        round.games.forEach((_, gameIndex) => {
          if (roundIndex < active) {
            centers[roundIndex][gameIndex] =
              spreadCenters[roundIndex][gameIndex];
          } else if (roundIndex === active) {
            centers[roundIndex][gameIndex] =
              TREE_VERTICAL_PADDING + gameIndex * rowStride + cardHeight / 2;
          } else {
            const feederTop = centers[roundIndex - 1][gameIndex * 2];
            const feederBottom = centers[roundIndex - 1][gameIndex * 2 + 1];
            centers[roundIndex][gameIndex] = (feederTop + feederBottom) / 2;
          }
        });
      });
      all.push(centers);
    }
    return all;
  }, [treeRounds, spreadCenters, roundCount, rowStride, cardHeight]);

  const cardLayout = useCallback(
    (roundIndex: number, gameIndex: number) => ({
      x: COLUMN_GUTTER / 2,
      y:
        (layoutsByActive[roundIndex]?.[roundIndex]?.[gameIndex] ??
          spreadCenters[roundIndex][gameIndex]) -
        cardHeight / 2,
      width: COLUMN_WIDTH - COLUMN_GUTTER,
      height: cardHeight,
    }),
    [layoutsByActive, spreadCenters, cardHeight],
  );

  // Canvas height tracks the ACTIVE round's stack so the last game sits flush
  // and you can't scroll past it into empty space.
  const canvasHeight = useMemo(() => {
    const activeGames = treeRounds[activeRoundIndex]?.games.length ?? 1;
    return activeGames * rowStride + TREE_VERTICAL_PADDING * 2;
  }, [treeRounds, activeRoundIndex, rowStride]);

  const canvasWidth = useMemo(() => PAGE_STRIDE * roundCount, [roundCount]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      "worklet";
      scrollX.value = event.contentOffset.x;
    },
  });

  const { highlightedGameId, glowAnim } = useBracketScrollToGame({
    scrollToGameId,
    treeRounds,
    playoffGame,
    maxGamesInAnyRound,
    verticalScrollRef,
    cardLayout,
    scrollTopOffset: SCROLL_TO_TOP_OFFSET,
  });

  const scrollToRound = useCallback((roundIndex: number, animated = true) => {
    programmaticScrollRef.current = true;
    horizontalScrollRef.current?.scrollTo({
      x: roundIndex * PAGE_STRIDE,
      animated,
    });
    setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 400);
  }, []);

  const handleTabPress = useCallback(
    (key: string) => {
      const roundIndex = Number(key);
      setActiveRoundIndex(roundIndex);
      if (viewMode === "tree") {
        scrollToRound(roundIndex);
      }
    },
    [scrollToRound, viewMode],
  );

  const handleViewModePress = useCallback(
    (mode: BracketViewMode) => {
      setViewMode(mode);
      if (mode === "tree") {
        // ScrollView remounts at the frozen initial offset, so re-sync the
        // shared value and actively scroll back to the round the user was on.
        scrollX.value = activeRoundIndex * PAGE_STRIDE;
        requestAnimationFrame(() => {
          scrollToRound(activeRoundIndex, false);
        });
      }
    },
    [activeRoundIndex, scrollX, scrollToRound],
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (programmaticScrollRef.current) return;
      const offsetX = event.nativeEvent.contentOffset.x;
      const nearestIndex = Math.round(offsetX / PAGE_STRIDE);
      const clamped = Math.max(0, Math.min(nearestIndex, roundCount - 1));
      setActiveRoundIndex(clamped);
    },
    [roundCount],
  );

  const activeRound = treeRounds[activeRoundIndex];
  const isFinalRoundActive = activeRoundIndex === roundCount - 1;

  return (
    <>
      <HeaderRow>
        <ViewToggleGroup>
          <ViewToggleButton
            isActive={viewMode === "tree"}
            onPress={() => handleViewModePress("tree")}
          >
            <Ionicons
              name="git-network-outline"
              size={15}
              color={viewMode === "tree" ? "#00A2FF" : "#aaa"}
            />
          </ViewToggleButton>
          <ViewToggleButton
            isActive={viewMode === "list"}
            onPress={() => handleViewModePress("list")}
          >
            <Ionicons
              name="list-outline"
              size={15}
              color={viewMode === "list" ? "#00A2FF" : "#aaa"}
            />
          </ViewToggleButton>
        </ViewToggleGroup>
        <TabsWrapper>
          <LineTabs
            tabs={tabs}
            activeTab={String(activeRoundIndex)}
            onTabPress={handleTabPress}
            scrollable
            fontSize={isSmallScreen ? 12 : 14}
          />
        </TabsWrapper>
      </HeaderRow>

      {viewMode === "tree" ? (
        <VerticalScroll
          ref={verticalScrollRef}
          showsVerticalScrollIndicator={false}
        >
          <Animated.ScrollView
            ref={horizontalScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={PAGE_STRIDE}
            snapToAlignment="start"
            contentOffset={initialContentOffset}
            scrollEventThrottle={16}
            onScroll={scrollHandler}
            onMomentumScrollEnd={handleMomentumScrollEnd}
          >
            <TreeCanvas style={{ width: canvasWidth, height: canvasHeight }}>
              <ConnectorLayer pointerEvents="none">
                <Svg width={canvasWidth} height={canvasHeight}>
                  {treeRounds.slice(0, -1).map((round, roundIndex) => {
                    const pageOffsetX = roundIndex * PAGE_STRIDE;
                    const fromX =
                      pageOffsetX +
                      COLUMN_GUTTER / 2 +
                      (COLUMN_WIDTH - COLUMN_GUTTER);
                    const toX =
                      (roundIndex + 1) * PAGE_STRIDE + COLUMN_GUTTER / 2;
                    return round.games.map((_, gameIndex) => {
                      const targetIndex = Math.floor(gameIndex / 2);
                      return (
                        <AnimatedConnector
                          key={`${roundIndex}-${gameIndex}`}
                          fromXValue={fromX}
                          toXValue={toX}
                          fromRound={roundIndex}
                          fromGame={gameIndex}
                          toRound={roundIndex + 1}
                          toGame={targetIndex}
                          layoutsByActive={layoutsByActive}
                          scrollX={scrollX}
                        />
                      );
                    });
                  })}
                </Svg>
              </ConnectorLayer>

              {treeRounds.map((round, roundIndex) => {
                const pageOffsetX = roundIndex * PAGE_STRIDE;
                return round.games.map((game, gameIndex) => {
                  const shouldMeasure = roundIndex === 0 && gameIndex === 0;
                  return (
                    <AnimatedBracketCard
                      key={game.gameId}
                      game={game}
                      label={perGameLabel(game, roundIndex, roundCount)}
                      tournamentType={tournamentType}
                      leftX={pageOffsetX + COLUMN_GUTTER / 2}
                      cardWidth={COLUMN_WIDTH - COLUMN_GUTTER}
                      cardHeight={cardHeight}
                      roundIndex={roundIndex}
                      gameIndex={gameIndex}
                      layoutsByActive={layoutsByActive}
                      scrollX={scrollX}
                      onLayout={shouldMeasure ? handleCardLayout : undefined}
                      onPress={() => onGamePress(game)}
                      isHighlighted={game.gameId === highlightedGameId}
                      glowAnim={glowAnim}
                      glowColor={glowColor}
                    />
                  );
                });
              })}
            </TreeCanvas>
          </Animated.ScrollView>

          {playoffGame && (
            <PlayoffSection>
              <BracketSectionLabel>3rd / 4th Place Playoff</BracketSectionLabel>
              <PlayoffCardWrapper>
                <BracketGameCard
                  game={playoffGame}
                  label="3rd/4th Playoff"
                  tournamentType={tournamentType}
                  shell={isShellGame(playoffGame)}
                  onPress={() => onGamePress(playoffGame)}
                />
                {playoffGame.gameId === highlightedGameId && (
                  <GameGlow glowAnim={glowAnim} color={glowColor} />
                )}
              </PlayoffCardWrapper>
            </PlayoffSection>
          )}
        </VerticalScroll>
      ) : (
        <VerticalScroll showsVerticalScrollIndicator={false}>
          <ListContainer>
            {activeRound?.games.map((game) => (
              <ListCardWrapper key={game.gameId}>
                <BracketGameCard
                  game={game}
                  label={perGameLabel(game, activeRoundIndex, roundCount)}
                  tournamentType={tournamentType}
                  shell={isShellGame(game)}
                  onPress={() => onGamePress(game)}
                />
              </ListCardWrapper>
            ))}

            {isFinalRoundActive && playoffGame && (
              <ListPlayoffSection>
                <BracketSectionLabel>
                  3rd / 4th Place Playoff
                </BracketSectionLabel>
                <BracketGameCard
                  game={playoffGame}
                  label="3rd/4th Playoff"
                  tournamentType={tournamentType}
                  shell={isShellGame(playoffGame)}
                  onPress={() => onGamePress(playoffGame)}
                />
              </ListPlayoffSection>
            )}
          </ListContainer>
        </VerticalScroll>
      )}
    </>
  );
};

// ── Header
const HeaderRow = styled.View({
  flexDirection: "row",
  alignItems: "flex-start",
});

const TabsWrapper = styled.View({
  flex: 1,
});

const ViewToggleGroup = styled.View({
  flexDirection: "row",
  alignItems: "center",
  paddingTop: 11,
  paddingRight: 12,
  paddingLeft: 6,
  gap: 6,
});

const ViewToggleButton = styled.TouchableOpacity<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    padding: 8,
    borderRadius: 8,
    backgroundColor: isActive ? "rgba(0, 162, 255, 0.15)" : "transparent",
  }),
);

// ── Tree
const VerticalScroll = styled.ScrollView({
  flex: 1,
});

const TreeCanvas = styled.View({
  position: "relative",
});

const ConnectorLayer = styled.View({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 0,
});

const cardBaseStyle = {
  position: "absolute" as const,
  top: 0,
  zIndex: 1,
};

// ── List
const ListContainer = styled.View({
  paddingHorizontal: 16,
  paddingTop: 10,
});

const ListCardWrapper = styled.View({
  marginBottom: 16,
});

const ListPlayoffSection = styled.View({
  paddingBottom: 24,
});

// ── Playoff (tree view)
const PlayoffSection = styled.View({
  alignItems: "center",
  paddingBottom: 24,
});

const PlayoffCardWrapper = styled.View({
  position: "relative",
  width: COLUMN_WIDTH - COLUMN_GUTTER,
});

export default BracketTree;
