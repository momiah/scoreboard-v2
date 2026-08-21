import React, { useCallback, useContext, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import styled from "styled-components/native";

import type { Ladder, LadderMatch } from "@shared/types";

import { useLadderJoin } from "../../../../hooks/useLadderJoin";
import { UserContext } from "../../../../context/UserContext";
import { LadderContext } from "../../../../context/LadderContext";
import { getOpenMatchmakingMatches } from "../../../../helpers/ladderScheduleMatches";
import AddLadderMatchModal from "../../../../components/Modals/AddLadderMatchModal";
import AcceptLadderMatchModal from "../../../../components/Modals/AcceptLadderMatchModal";
import MatchCard from "../../../../components/ladder/MatchCard";
import { SkeletonWrapper } from "../../../../components/Skeletons/SkeletonComponents";

interface MatchmakingProps {
  ladder: Ladder;
}

const SKELETON_ROWS = [0, 1, 2];

const Matchmaking: React.FC<MatchmakingProps> = ({ ladder }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { currentUser } = useContext(UserContext);
  const { fetchLadderMatches } = useContext(LadderContext);

  const [postModalVisible, setPostModalVisible] = useState(false);
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<LadderMatch | null>(null);
  const [matches, setMatches] = useState<LadderMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  const { isSignedIn, isParticipant, membershipChecking } = useLadderJoin(
    ladder,
    () => setPostModalVisible(true),
  );

  const userId = currentUser?.userId;

  // Reload the posted-match list whenever this tab gains focus (which includes
  // the first mount when it becomes the selected tab).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadMatches = async () => {
        setMatchesLoading(true);
        try {
          const all = await fetchLadderMatches(ladder.ladderId);
          if (active) setMatches(getOpenMatchmakingMatches(all));
        } catch (error) {
          console.error("Error loading matchmaking matches:", error);
          if (active) setMatches([]);
        } finally {
          if (active) setMatchesLoading(false);
        }
      };
      loadMatches();
      return () => {
        active = false;
      };
    }, [fetchLadderMatches, ladder.ladderId]),
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

  // Drop a match from the open list straight away rather than waiting for the
  // next focus refetch — used both when this user accepts it and when they lose
  // the race to someone else (either way it's no longer available).
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

    if (matches.length === 0) {
      return (
        <EmptyState testID="matchmaking-empty">
          <EmptyTitle>No open matches right now</EmptyTitle>
          <EmptyBody>
            Check back soon or post a match to get a game going.
          </EmptyBody>
        </EmptyState>
      );
    }

    return (
      <List testID="matchmaking-list">
        {matches.map((match) => {
          const isOwn = !!userId && match.participants.includes(userId);
          return (
            <MatchCard
              key={match.ladderMatchId}
              testID={`matchmaking-card-${match.ladderMatchId}`}
              match={match}
              disabled={isOwn}
              disabledLabel={isOwn ? "Your match" : undefined}
              onPress={handleAcceptPress}
            />
          );
        })}
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

      {renderMatches()}

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
  padding: 20,
  gap: 12,
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
