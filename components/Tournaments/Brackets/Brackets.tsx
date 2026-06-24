// components/Tournament/Brackets/Brackets.tsx
import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useContext,
} from "react";
import {
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import styled from "styled-components/native";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";

import LineTabs from "../../LineTabs";
import { BracketGameCard, BracketSectionLabel } from "./BracketAtoms";
import AddTournamentGameModal from "../../Modals/AddTournamentGameModal";
import { UserContext } from "../../../context/UserContext";
import { Fixtures, Game } from "@shared/types";
import { COMPETITION_TYPES } from "@shared";
import { roundLabel } from "../../../helpers/Tournament/knockout";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COLUMN_WIDTH = SCREEN_WIDTH * 0.78;
const COLUMN_GUTTER = 12;
const STRIDE = COLUMN_WIDTH + COLUMN_GUTTER;
const TREE_VERTICAL_PADDING = 20;
const CANVAS_HORIZONTAL_PADDING = COLUMN_GUTTER / 2;
const CONNECTOR_STROKE = "rgba(255, 255, 255, 0.25)";
const CONNECTOR_STROKE_WIDTH = 1;

interface BracketsProps {
  tournament: {
    fixtures?: Fixtures[];
    tournamentType?: string;
    tournamentName?: string;
    tournamentId?: string;
  };
}

interface CardLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Headers come from teams remaining in the round — ignoring the playoff,
// since the playoff is rendered outside the tree.
const headerForRound = (games: Game[]): string => {
  const playableGames = games.filter((g) => !g.isThirdPlacePlayoff).length;
  return roundLabel(playableGames * 2);
};

// Per-game label: only the actual Final (the non-playoff game in the last round)
// gets a label. Earlier rounds never do.
const perGameLabel = (
  game: Game,
  roundIndex: number,
  totalRounds: number,
): string | null => {
  if (game.isThirdPlacePlayoff) return "3rd/4th Playoff";
  if (roundIndex === totalRounds - 1) return "Final";
  return null;
};

const isShellGame = (game: Game): boolean =>
  !game.team1.player1 && !game.team2.player1;

const Brackets = ({ tournament }: BracketsProps) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { currentUser } = useContext(UserContext);

  const fixtures = tournament?.fixtures ?? [];
  const tournamentType = tournament?.tournamentType || "Doubles";
  const tournamentName = tournament?.tournamentName;
  const tournamentId = tournament?.tournamentId;

  const [activeRoundIndex, setActiveRoundIndex] = useState(0);
  const [cardLayouts, setCardLayouts] = useState<Record<string, CardLayout>>(
    {},
  );
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [localFixtures, setLocalFixtures] = useState<Fixtures[]>(fixtures);

  const horizontalScrollRef = useRef<ScrollView>(null);
  const programmaticScrollRef = useRef(false);

  // Tree-only games per round: playoff filtered out (rendered separately).
  const treeRounds = useMemo(
    () =>
      localFixtures.map((round) => ({
        round: round.round,
        games: round.games.filter((g) => !g.isThirdPlacePlayoff),
      })),
    [localFixtures],
  );

  // The playoff card, if it exists. Sits outside the tree.
  const playoffGame = useMemo(() => {
    for (const round of localFixtures) {
      const playoff = round.games.find((g) => g.isThirdPlacePlayoff);
      if (playoff) return playoff;
    }
    return null;
  }, [localFixtures]);

  const tabs = useMemo(
    () =>
      treeRounds.map((round, index) => ({
        key: String(index),
        label: headerForRound(round.games),
      })),
    [treeRounds],
  );

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

  const handleTabPress = useCallback(
    (key: string) => {
      const roundIndex = Number(key);
      setActiveRoundIndex(roundIndex);
      scrollToRound(roundIndex);
    },
    [scrollToRound],
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

  const handleCardLayout = useCallback(
    (roundIndex: number, gameIndex: number, event: LayoutChangeEvent) => {
      const { x, y, width, height } = event.nativeEvent.layout;
      const columnLeft =
        CANVAS_HORIZONTAL_PADDING + roundIndex * STRIDE + COLUMN_GUTTER / 2;
      const canvasX = columnLeft + x;
      const layoutKey = `${roundIndex}-${gameIndex}`;

      setCardLayouts((previous) => {
        const existing = previous[layoutKey];
        if (
          existing &&
          existing.x === canvasX &&
          existing.y === y &&
          existing.width === width &&
          existing.height === height
        ) {
          return previous;
        }
        return {
          ...previous,
          [layoutKey]: { x: canvasX, y, width, height },
        };
      });
    },
    [],
  );

  const handleGamePress = useCallback(
    (game: Game) => {
      if (isShellGame(game)) return;

      if (game.result) {
        navigation.navigate("GameScreen", {
          gameId: game.gameId,
          competitionId: tournamentId,
          competitionType: COMPETITION_TYPES.TOURNAMENT,
          competitionName: tournamentName,
          gamescore: game.gamescore,
          date: game.date ?? "",
          team1: game.team1,
          team2: game.team2,
        });
        return;
      }

      setSelectedGame(game);
      setGameModalVisible(true);
    },
    [navigation, tournamentId, tournamentName],
  );

  const handleGameUpdated = useCallback((updatedGame: Game) => {
    setLocalFixtures((previous) =>
      previous.map((round) => ({
        ...round,
        games: round.games.map((game) =>
          game.gameId === updatedGame.gameId ? updatedGame : game,
        ),
      })),
    );
  }, []);

  // Simple positional connectors now that the playoff is out of the tree.
  // Child i in round R+1 is fed by games 2i and 2i+1 in round R.
  const connectorPaths = useMemo(() => {
    const paths: { d: string; key: string }[] = [];

    for (let roundIndex = 0; roundIndex < treeRounds.length - 1; roundIndex++) {
      const currentRound = treeRounds[roundIndex];

      currentRound.games.forEach((_, gameIndex) => {
        const fromLayout = cardLayouts[`${roundIndex}-${gameIndex}`];
        if (!fromLayout) return;

        const targetIndex = Math.floor(gameIndex / 2);
        const toLayout = cardLayouts[`${roundIndex + 1}-${targetIndex}`];
        if (!toLayout) return;

        const fromX = fromLayout.x + fromLayout.width;
        const fromY = fromLayout.y + fromLayout.height / 2;
        const toX = toLayout.x;
        const toY = toLayout.y + toLayout.height / 2;
        const midX = (fromX + toX) / 2;

        const d = `M ${fromX} ${fromY} H ${midX} V ${toY} H ${toX}`;
        paths.push({ d, key: `${roundIndex}-${gameIndex}-to-${targetIndex}` });
      });
    }

    return paths;
  }, [cardLayouts, treeRounds]);

  const treeDimensions = useMemo(() => {
    const layouts = Object.values(cardLayouts);
    const fallbackWidth =
      STRIDE * treeRounds.length + CANVAS_HORIZONTAL_PADDING * 2;
    if (!layouts.length) return { width: fallbackWidth, height: 600 };
    const maxX = Math.max(...layouts.map((l) => l.x + l.width));
    const maxY = Math.max(...layouts.map((l) => l.y + l.height));
    return {
      width: Math.max(maxX + COLUMN_GUTTER, fallbackWidth),
      height: maxY + TREE_VERTICAL_PADDING * 2,
    };
  }, [cardLayouts, treeRounds.length]);

  if (!treeRounds.length) return null;

  return (
    <Container>
      <LineTabs
        tabs={tabs}
        activeTab={String(activeRoundIndex)}
        onTabPress={handleTabPress}
      />

      <VerticalScroll showsVerticalScrollIndicator={false}>
        <HorizontalScroll
          ref={horizontalScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={STRIDE}
          snapToAlignment="start"
          onMomentumScrollEnd={handleMomentumScrollEnd}
        >
          <TreeCanvas
            style={{
              width: treeDimensions.width,
              minHeight: treeDimensions.height,
            }}
          >
            <ConnectorLayer pointerEvents="none">
              <Svg width={treeDimensions.width} height={treeDimensions.height}>
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

            {treeRounds.map((round, roundIndex) => (
              <RoundColumn key={`round-${round.round}`}>
                {round.games.map((game, gameIndex) => {
                  const shell = isShellGame(game);
                  const label = perGameLabel(
                    game,
                    roundIndex,
                    treeRounds.length,
                  );
                  return (
                    <GameCardWrapper
                      key={game.gameId}
                      onLayout={(event: LayoutChangeEvent) =>
                        handleCardLayout(roundIndex, gameIndex, event)
                      }
                    >
                      <BracketGameCard
                        game={game}
                        label={label}
                        tournamentType={tournamentType}
                        shell={shell}
                        onPress={() => handleGamePress(game)}
                      />
                    </GameCardWrapper>
                  );
                })}
              </RoundColumn>
            ))}
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
                onPress={() => handleGamePress(playoffGame)}
              />
            </PlayoffCardWrapper>
          </PlayoffSection>
        )}
      </VerticalScroll>

      <AddTournamentGameModal
        visible={gameModalVisible}
        game={selectedGame}
        tournamentType={tournamentType}
        currentUser={currentUser}
        tournamentName={tournamentName ?? ""}
        tournamentId={tournamentId ?? ""}
        onClose={() => {
          setGameModalVisible(false);
          setSelectedGame(null);
        }}
        onGameUpdated={handleGameUpdated}
      />
    </Container>
  );
};

const Container = styled.View({
  flex: 1,
});

const VerticalScroll = styled.ScrollView({
  flex: 1,
});

const HorizontalScroll = styled.ScrollView({});

const TreeCanvas = styled.View({
  flexDirection: "row",
  alignItems: "stretch",
  paddingVertical: TREE_VERTICAL_PADDING,
  paddingHorizontal: CANVAS_HORIZONTAL_PADDING,
});

const ConnectorLayer = styled.View({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 0,
});

const RoundColumn = styled.View({
  width: COLUMN_WIDTH,
  marginHorizontal: COLUMN_GUTTER / 2,
  justifyContent: "space-around",
  zIndex: 1,
});

const GameCardWrapper = styled.View({
  marginVertical: 8,
});

const PlayoffSection = styled.View({
  paddingHorizontal: 16,
  paddingBottom: 24,
});

const PlayoffCardWrapper = styled.View({});

export default Brackets;
