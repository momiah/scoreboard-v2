import { useCallback, useRef } from "react";
import { ScrollView, View } from "react-native";
import { useScrollToGameGlow } from "@/components/GameCardGlow";

// Fixtures-specific scroll logic (measureLayout on card refs),
// sharing glow timing/state/colour behaviour with brackets via useScrollToGameGlow.
export const useFixturesScrollToGame = (scrollToGameId?: string) => {
  const scrollRef = useRef<ScrollView>(null);
  const gameRefs = useRef<Record<string, View>>({});

  const scrollToGame = useCallback((gameId: string): boolean => {
    const node = gameRefs.current[gameId];
    const scrollNode = scrollRef.current?.getInnerViewNode?.();
    if (!node || !scrollNode) return false;

    node.measureLayout(
      scrollNode,
      (_left: number, top: number) => {
        scrollRef.current?.scrollTo({ y: top, animated: true });
      },
      () => {},
    );
    return true;
  }, []);

  const { highlightedGameId, glowAnim } = useScrollToGameGlow(
    scrollToGameId,
    scrollToGame,
  );

  return { scrollRef, gameRefs, highlightedGameId, glowAnim };
};
