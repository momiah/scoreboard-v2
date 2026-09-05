import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import {
  ALL_DAYS_KEY,
  buildScheduleDayTabs,
  filterMatchesByDay,
  getMatchDayKeys,
  todayDayKey,
} from "../../../../helpers/ladderDayTabs";
import MatchCard from "../../../../components/ladder/MatchCard";
import LineTabs from "../../../../components/LineTabs";
import GameGlow, { runGlow } from "../../../../components/GameCardGlow";
import { SkeletonWrapper } from "../../../../components/Skeletons/SkeletonComponents";

interface ScheduleProps {
  ladder: Ladder;
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
  const [selectedDay, setSelectedDay] = useState<string>(ALL_DAYS_KEY);

  const dayTabs = useMemo(() => buildScheduleDayTabs(ladder), [ladder]);
  const gameDayKeys = useMemo(() => getMatchDayKeys(matches), [matches]);
  const todayKey = useMemo(() => todayDayKey(), []);
  const visibleMatches = useMemo(
    () => filterMatchesByDay(matches, selectedDay),
    [matches, selectedDay],
  );

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
          <SkeletonWrapper
            key={row}
            show
            height={116}
            width="100%"
            radius={10}
          />
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
      <TabsRow>
        <AllTab
          isActive={selectedDay === ALL_DAYS_KEY}
          activeOpacity={0.8}
          onPress={() => setSelectedDay(ALL_DAYS_KEY)}
          testID="schedule-all-tab"
        >
          <AllTabText isActive={selectedDay === ALL_DAYS_KEY}>All</AllTabText>
        </AllTab>
        <DayTabsWrap>
          <LineTabs
            scrollable
            fontSize={13}
            tabs={dayTabs}
            activeTab={selectedDay}
            onTabPress={setSelectedDay}
            highlightKey={todayKey}
            scrollToKey={todayKey}
            dotKeys={gameDayKeys}
          />
        </DayTabsWrap>
      </TabsRow>
      <ListScroll
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
      >
        {visibleMatches.map((match) => (
          <CardWrap key={match.ladderMatchId}>
            <MatchCard
              testID={`schedule-card-${match.ladderMatchId}`}
              match={match}
              onPress={handleOpenMatch}
              showProgress
            />
            {glowMatchId === match.ladderMatchId && (
              <GameGlow glowAnim={glowAnim} color="#00A2FF" />
            )}
          </CardWrap>
        ))}
      </ListScroll>
    </Container>
  );
};

export default Schedule;

const Container = styled.View({
  flex: 1,
  padding: 20,
  gap: 12,
});

const TabsRow = styled.View({
  flexDirection: "row",
  alignItems: "flex-start",
});

const DayTabsWrap = styled.View({
  flex: 1,
  minWidth: 0,
});

const AllTab = styled.TouchableOpacity<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 10,
    borderBottomWidth: 2,
    borderBottomColor: isActive ? "#00A2FF" : "rgb(9, 33, 62)",
    justifyContent: "center",
    alignItems: "center",
  }),
);

const AllTabText = styled.Text<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    fontSize: 13,
    fontWeight: "bold",
    color: isActive ? "#fff" : "#aaa",
  }),
);

const ListScroll = styled.ScrollView({
  flex: 1,
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
