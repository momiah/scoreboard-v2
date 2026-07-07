import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isSmallScreen = SCREEN_WIDTH <= 430;

const COLUMN_WIDTH = SCREEN_WIDTH * 0.88;
const COLUMN_GUTTER = 35;
const STRIDE = COLUMN_WIDTH + COLUMN_GUTTER;
const TREE_VERTICAL_PADDING = 20;
const CANVAS_HORIZONTAL_PADDING = -5;
const CONNECTOR_STROKE = "rgba(255, 255, 255, 0.25)";
const CONNECTOR_STROKE_WIDTH = 1;
const CARD_HEIGHT = 160;
const CARD_MARGIN_VERTICAL = 8;
const ROW_HEIGHT = CARD_HEIGHT + CARD_MARGIN_VERTICAL * 2;
const SCROLL_TO_TOP_OFFSET = 40;

type BracketViewMode = "tree" | "list";

interface BracketTreeProps {
  fixtures: Fixtures[];
  tournamentType: string;
  onGamePress: (game: Game) => void;
  scrollToGameId?: string;
  glowColor?: string;
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

const cardLayout = (
  roundIndex: number,
  gameIndex: number,
  gamesInRound: number,
  maxGamesInAnyRound: number,
) => {
  const columnLeft =
    CANVAS_HORIZONTAL_PADDING + roundIndex * STRIDE + COLUMN_GUTTER / 2;
  const rowHeight = ROW_HEIGHT * (maxGamesInAnyRound / gamesInRound);
  return {
    x: columnLeft,
    y:
      TREE_VERTICAL_PADDING +
      gameIndex * rowHeight +
      (rowHeight - CARD_HEIGHT) / 2,
    width: COLUMN_WIDTH - COLUMN_GUTTER,
    height: CARD_HEIGHT,
  };
};

const BracketTree = ({
  fixtures,
  tournamentType,
  onGamePress,
  scrollToGameId,
  glowColor = "#00A2FF",
}: BracketTreeProps) => {
  const treeRounds = useMemo(
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

  // Start on the target game's round (playoff lives on the final round).
  const initialRoundIndex = useMemo(() => {
    const { roundIndex } = findGamePosition(treeRounds, scrollToGameId);
    if (roundIndex !== -1) return roundIndex;
    if (playoffGame?.gameId === scrollToGameId) return treeRounds.length - 1;
    return 0;
  }, []);

  const [activeRoundIndex, setActiveRoundIndex] = useState(initialRoundIndex);
  const [viewMode, setViewMode] = useState<BracketViewMode>("tree");
  const horizontalScrollRef = useRef<ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);
  const programmaticScrollRef = useRef(false);

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

  const treeDimensions = useMemo(
    () => ({
      width: STRIDE * treeRounds.length + CANVAS_HORIZONTAL_PADDING * 2,
      height: maxGamesInAnyRound * ROW_HEIGHT + TREE_VERTICAL_PADDING * 2,
    }),
    [treeRounds.length, maxGamesInAnyRound],
  );

  const connectorPaths = useMemo(() => {
    const paths: { d: string; key: string }[] = [];
    for (let roundIndex = 0; roundIndex < treeRounds.length - 1; roundIndex++) {
      const currentRound = treeRounds[roundIndex];
      const nextRound = treeRounds[roundIndex + 1];
      currentRound.games.forEach((_, gameIndex) => {
        const from = cardLayout(
          roundIndex,
          gameIndex,
          currentRound.games.length,
          maxGamesInAnyRound,
        );
        const targetIndex = Math.floor(gameIndex / 2);
        const to = cardLayout(
          roundIndex + 1,
          targetIndex,
          nextRound.games.length,
          maxGamesInAnyRound,
        );
        const fromX = from.x + from.width;
        const fromY = from.y + from.height / 2;
        const toX = to.x;
        const toY = to.y + to.height / 2;
        const midX = (fromX + toX) / 2;
        paths.push({
          d: `M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}`,
          key: `${roundIndex}-${gameIndex}-to-${targetIndex}`,
        });
      });
    }
    return paths;
  }, [treeRounds, maxGamesInAnyRound]);

  const scrollToRound = useCallback((roundIndex: number, animated = true) => {
    programmaticScrollRef.current = true;
    horizontalScrollRef.current?.scrollTo({
      x: roundIndex * STRIDE,
      animated,
    });
    setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 400);
  }, []);

  const { highlightedGameId, glowAnim } = useBracketScrollToGame({
    scrollToGameId,
    treeRounds,
    playoffGame,
    maxGamesInAnyRound,
    verticalScrollRef,
    cardLayout,
    scrollTopOffset: SCROLL_TO_TOP_OFFSET,
  });

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
        // Tree remounts at its contentOffset round; keep tabs in sync.
        setActiveRoundIndex(initialRoundIndex);
      }
    },
    [initialRoundIndex],
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (programmaticScrollRef.current) return;
      const offsetX = event.nativeEvent.contentOffset.x;
      const nearestIndex = Math.round(offsetX / STRIDE);
      const clamped = Math.max(
        0,
        Math.min(nearestIndex, treeRounds.length - 1),
      );
      setActiveRoundIndex(clamped);
      programmaticScrollRef.current = true;
      horizontalScrollRef.current?.scrollTo({
        x: clamped * STRIDE,
        animated: true,
      });
      setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 400);
    },
    [treeRounds.length],
  );

  const activeRound = treeRounds[activeRoundIndex];
  const isFinalRoundActive = activeRoundIndex === treeRounds.length - 1;

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
          <HorizontalScroll
            ref={horizontalScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={STRIDE}
            snapToAlignment="start"
            contentOffset={{ x: initialRoundIndex * STRIDE, y: 0 }}
            onMomentumScrollEnd={handleMomentumScrollEnd}
          >
            <TreeCanvas
              style={{
                width: treeDimensions.width,
                height: treeDimensions.height,
              }}
            >
              <ConnectorLayer pointerEvents="none">
                <Svg
                  width={treeDimensions.width}
                  height={treeDimensions.height}
                >
                  {connectorPaths.map((path) => (
                    <Path
                      key={path.key}
                      d={path.d}
                      stroke={CONNECTOR_STROKE}
                      strokeWidth={CONNECTOR_STROKE_WIDTH}
                      fill="none"
                    />
                  ))}
                </Svg>
              </ConnectorLayer>

              {treeRounds.map((round, roundIndex) =>
                round.games.map((game, gameIndex) => {
                  const layout = cardLayout(
                    roundIndex,
                    gameIndex,
                    round.games.length,
                    maxGamesInAnyRound,
                  );
                  const shell = isShellGame(game);
                  const label = perGameLabel(
                    game,
                    roundIndex,
                    treeRounds.length,
                  );
                  return (
                    <PositionedCard
                      key={game.gameId}
                      style={{
                        top: layout.y,
                        left: layout.x,
                        width: layout.width,
                        height: layout.height,
                      }}
                    >
                      <BracketGameCard
                        game={game}
                        label={label}
                        tournamentType={tournamentType}
                        shell={shell}
                        onPress={() => onGamePress(game)}
                      />
                      {game.gameId === highlightedGameId && (
                        <GameGlow glowAnim={glowAnim} color={glowColor} />
                      )}
                    </PositionedCard>
                  );
                }),
              )}
            </TreeCanvas>
          </HorizontalScroll>

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
                  label={perGameLabel(
                    game,
                    activeRoundIndex,
                    treeRounds.length,
                  )}
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

const HorizontalScroll = styled.ScrollView({});

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

const PositionedCard = styled.View({
  position: "absolute",
  zIndex: 1,
});

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
  paddingHorizontal: 16,
  paddingBottom: 24,
});

const PlayoffCardWrapper = styled.View({
  position: "relative",
});

export default BracketTree;
