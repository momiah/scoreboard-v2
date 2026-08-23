import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import styled from "styled-components/native";

import type { Ladder, LadderMatch } from "@shared/types";

import { UserContext } from "../../../../context/UserContext";
import { LadderContext } from "../../../../context/LadderContext";
import { getMyScheduleMatches } from "../../../../helpers/ladderScheduleMatches";
import MatchCard from "../../../../components/ladder/MatchCard";
import GameGlow, { runGlow } from "../../../../components/GameCardGlow";
import { SkeletonWrapper } from "../../../../components/Skeletons/SkeletonComponents";

interface ScheduleProps {
  ladder: Ladder;
  // Match to highlight with a blue glow (e.g. arriving from an accept notification).
  highlightMatchId?: string;
}

const SKELETON_ROWS = [0, 1, 2];

const Schedule: React.FC<ScheduleProps> = ({ ladder, highlightMatchId }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { currentUser } = useContext(UserContext);
  const { fetchLadderMatches } = useContext(LadderContext);

  const [matches, setMatches] = useState<LadderMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [glowMatchId, setGlowMatchId] = useState<string | null>(null);

  const userId = currentUser?.userId;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const glowedFor = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        setLoading(true);
        try {
          const all = await fetchLadderMatches(ladder.ladderId);
          if (active) setMatches(getMyScheduleMatches(all, userId ?? ""));
        } catch (error) {
          console.error("Error loading schedule matches:", error);
          if (active) setMatches([]);
        } finally {
          if (active) setLoading(false);
        }
      };
      load();
      return () => {
        active = false;
      };
    }, [fetchLadderMatches, ladder.ladderId, userId]),
  );

  // Glow the highlighted match once it's in the list (fires a single time).
  useEffect(() => {
    if (
      !highlightMatchId ||
      glowedFor.current === highlightMatchId ||
      !matches.some((m) => m.ladderMatchId === highlightMatchId)
    ) {
      return;
    }
    glowedFor.current = highlightMatchId;
    setGlowMatchId(highlightMatchId);
    runGlow(glowAnim, () => setGlowMatchId(null));
  }, [highlightMatchId, matches, glowAnim]);

  const handleOpenMatch = (match: LadderMatch) => {
    navigation.navigate("MatchDetails", {
      ladderId: ladder.ladderId,
      matchId: match.ladderMatchId,
      match,
      ladderType: ladder.ladderType,
    });
  };

  if (loading) {
    return (
      <Container testID="schedule-loading">
        {SKELETON_ROWS.map((row) => (
          <SkeletonWrapper key={row} show height={116} width="100%" radius={10} />
        ))}
      </Container>
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState testID="schedule-empty">
        <EmptyTitle>No scheduled matches yet</EmptyTitle>
        <EmptyBody>
          Accept a match from Matchmaking and it&apos;ll show up here.
        </EmptyBody>
      </EmptyState>
    );
  }

  return (
    <Container testID="schedule-list">
      {matches.map((match) => (
        <CardWrap key={match.ladderMatchId}>
          <MatchCard
            testID={`schedule-card-${match.ladderMatchId}`}
            match={match}
            onPress={handleOpenMatch}
            showProgress
            currentUserId={userId}
          />
          {glowMatchId === match.ladderMatchId && (
            <GameGlow glowAnim={glowAnim} color="#00A2FF" />
          )}
        </CardWrap>
      ))}
    </Container>
  );
};

export default Schedule;

const Container = styled.View({
  padding: 20,
  gap: 12,
});

const CardWrap = styled.View({
  position: "relative",
});

const EmptyState = styled.View({
  paddingVertical: 60,
  paddingHorizontal: 20,
  alignItems: "center",
  gap: 8,
});

const EmptyTitle = styled.Text({
  color: "#e2e8f0",
  fontSize: 16,
  fontWeight: "bold",
});

const EmptyBody = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  textAlign: "center",
});
