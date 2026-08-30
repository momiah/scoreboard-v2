import React, { useCallback, useContext, useMemo, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import styled from "styled-components/native";

import type { Ladder, LadderMatch } from "@shared/types";

import { useLadderJoin } from "../../../../hooks/useLadderJoin";
import { LadderContext } from "../../../../context/LadderContext";
import { getOpenMatchmakingMatches } from "../../../../helpers/ladderScheduleMatches";
import {
  ALL_DAYS_KEY,
  buildMatchmakingDayTabs,
  filterMatchesByDay,
} from "../../../../helpers/ladderDayTabs";
import AddLadderMatchModal from "../../../../components/Modals/AddLadderMatchModal";
import AcceptLadderMatchModal from "../../../../components/Modals/AcceptLadderMatchModal";
import MatchCard from "../../../../components/ladder/MatchCard";
import LineTabs from "../../../../components/LineTabs";
import { SkeletonWrapper } from "../../../../components/Skeletons/SkeletonComponents";

interface MatchmakingProps {
  ladder: Ladder;
}

const SKELETON_ROWS = [0, 1, 2];

const Matchmaking: React.FC<MatchmakingProps> = ({ ladder }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { subscribeToLadderMatches } = useContext(LadderContext);

  const [postModalVisible, setPostModalVisible] = useState(false);
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<LadderMatch | null>(null);
  const [matches, setMatches] = useState<LadderMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>(ALL_DAYS_KEY);

  // Every day up to the end of the matchmaking window, for quick date picking.
  const dayTabs = useMemo(() => buildMatchmakingDayTabs(ladder), [ladder]);
  const visibleMatches = useMemo(
    () => filterMatchesByDay(matches, selectedDay),
    [matches, selectedDay],
  );

  const { isSignedIn, isParticipant, membershipChecking } = useLadderJoin(
    ladder,
    () => setPostModalVisible(true),
  );

  // Subscribe in realtime so a freshly posted match (or one that's just been
  // accepted) appears/disappears without needing to refetch on focus.
  useFocusEffect(
    useCallback(() => {
      setMatchesLoading(true);
      const unsubscribe = subscribeToLadderMatches(
        ladder.ladderId,
        (all) => {
          setMatches(getOpenMatchmakingMatches(all));
          setMatchesLoading(false);
        },
        () => {
          setMatches([]);
          setMatchesLoading(false);
        },
      );
      return unsubscribe;
    }, [subscribeToLadderMatches, ladder.ladderId]),
  );

  const nonParticipant = isSignedIn && !isParticipant;
  const buttonLabel = nonParticipant
    ? "Join the ladder to post"
    : "Post a Match";

  const handlePostMatch = () => {
    if (!isSignedIn) {
      navigation.navigate("Login");
      return;
    }
    if (!isParticipant) return;
    setPostModalVisible(true);
  };

  const handleAcceptPress = (match: LadderMatch) => {
    setSelectedMatch(match);
    setAcceptModalVisible(true);
  };

  const handleMatchGone = (gone: LadderMatch) => {
    setMatches((prev) =>
      prev.filter((m) => m.ladderMatchId !== gone.ladderMatchId),
    );
  };

  const renderMatches = () => {
    if (matchesLoading) {
      return (
        <List testID="matchmaking-loading">
          {SKELETON_ROWS.map((row) => (
            <SkeletonWrapper key={row} show height={116} width="100%" radius={10} />
          ))}
        </List>
      );
    }

    if (visibleMatches.length === 0) {
      const dayFiltered = selectedDay !== ALL_DAYS_KEY;
      return (
        <EmptyState testID="matchmaking-empty">
          <EmptyTitle>
            {dayFiltered
              ? "No open matches on this day"
              : "No open matches right now"}
          </EmptyTitle>
          <EmptyBody>
            {dayFiltered
              ? "Try another day, or post a match to get a game going."
              : "Check back soon or post a match to get a game going."}
          </EmptyBody>
        </EmptyState>
      );
    }

    return (
      <List testID="matchmaking-list">
        {visibleMatches.map((match) => (
          <MatchCard
            key={match.ladderMatchId}
            testID={`matchmaking-card-${match.ladderMatchId}`}
            match={match}
            onPress={handleAcceptPress}
          />
        ))}
      </List>
    );
  };

  return (
    <Container testID="ladder-matchmaking">
      {membershipChecking ? (
        <SkeletonButtonWrap testID="matchmaking-post-skeleton">
          <SkeletonWrapper show height={44} width="100%" radius={8} />
        </SkeletonButtonWrap>
      ) : (
        <PostButton
          testID="matchmaking-post-match"
          activeOpacity={0.85}
          disabled={nonParticipant}
          isDisabled={nonParticipant}
          onPress={handlePostMatch}
        >
          <PostButtonText>{buttonLabel}</PostButtonText>
        </PostButton>
      )}

      <LineTabs
        scrollable
        fontSize={13}
        tabs={dayTabs}
        activeTab={selectedDay}
        onTabPress={setSelectedDay}
      />

      <ListScroll
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {renderMatches()}
      </ListScroll>

      <AddLadderMatchModal
        modalVisible={postModalVisible}
        setModalVisible={setPostModalVisible}
        ladder={ladder}
      />

      <AcceptLadderMatchModal
        modalVisible={acceptModalVisible}
        setModalVisible={setAcceptModalVisible}
        ladder={ladder}
        match={selectedMatch}
        onAccepted={handleMatchGone}
        onUnavailable={handleMatchGone}
      />
    </Container>
  );
};

export default Matchmaking;

const Container = styled.View({
  flex: 1,
  padding: 20,
  gap: 12,
});

// Scrolls the match list while the post button + day strip stay pinned above.
const ListScroll = styled.ScrollView({
  flex: 1,
});

const List = styled.View({
  gap: 12,
});

const SkeletonButtonWrap = styled.View({
  width: "100%",
});

const PostButton = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    width: "100%",
    padding: 10,
    borderRadius: 8,
    backgroundColor: isDisabled ? "#1e3a52" : "#00A2FF",
    alignItems: "center",
    opacity: isDisabled ? 0.7 : 1,
  }),
);

const PostButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const EmptyState = styled.View({
  paddingVertical: 40,
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
