import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import styled from "styled-components/native";

import type { Ladder, LadderMatch } from "@shared/types";

import { useLadderJoin } from "../../../../hooks/useLadderJoin";
import { useLadderHomeCourt } from "../../../../hooks/useLadderHomeCourt";
import { LadderContext } from "../../../../context/LadderContext";
import { PopupContext } from "../../../../context/PopupContext";
import { getOpenMatchmakingMatches } from "../../../../helpers/ladderScheduleMatches";
import {
  ALL_DAYS_KEY,
  buildMatchmakingDayTabs,
  filterMatchesByDay,
  ladderPostingClosed,
  ladderRegistrationOpen,
  todayDayKey,
} from "../../../../helpers/ladderDayTabs";
import AddLadderMatchModal from "../../../../components/Modals/AddLadderMatchModal";
import AcceptLadderMatchModal from "../../../../components/Modals/AcceptLadderMatchModal";
import MatchCard from "../../../../components/ladder/MatchCard";
import SearchCourt from "../../../../components/Modals/SearchLocationModal";
import { NO_COURTS_MESSAGE } from "../../../../components/Summary/LadderHomeCourtSection";
import { useLadderCourts } from "../../../../hooks/useLadderCourts";
import InfoModal from "../../../../components/Modals/InfoModal";
import LineTabs from "../../../../components/LineTabs";
import { SkeletonWrapper } from "../../../../components/Skeletons/SkeletonComponents";

interface MatchmakingProps {
  ladder: Ladder;
}

const SKELETON_ROWS = [0, 1, 2];
const MODAL_HANDOFF_MS = 350;

const Matchmaking: React.FC<MatchmakingProps> = ({ ladder }) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { subscribeToLadderMatches } = useContext(LadderContext);
  const { showBottomToast } = useContext(PopupContext);

  const [postModalVisible, setPostModalVisible] = useState(false);
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<LadderMatch | null>(null);
  const [matches, setMatches] = useState<LadderMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>(ALL_DAYS_KEY);

  const dayTabs = useMemo(() => buildMatchmakingDayTabs(ladder), [ladder]);
  const todayKey = useMemo(() => todayDayKey(), []);
  const visibleMatches = useMemo(
    () => filterMatchesByDay(matches, selectedDay),
    [matches, selectedDay],
  );

  const { isSignedIn, isParticipant, membershipChecking } = useLadderJoin(
    ladder,
    () => setPostModalVisible(true),
  );

  const {
    homeCourt,
    hasHomeCourt,
    loading: homeCourtLoading,
    confirmHomeCourt,
  } = useLadderHomeCourt(ladder);
  const [homeCourtInfoVisible, setHomeCourtInfoVisible] = useState(false);
  const [homeCourtSelectorVisible, setHomeCourtSelectorVisible] =
    useState(false);
  const ladderCourts = useLadderCourts(ladder, homeCourtSelectorVisible);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const requireHomeCourt = (action: () => void) => {
    if (hasHomeCourt) {
      action();
      return;
    }
    if (homeCourtLoading) return;
    pendingActionRef.current = action;
    setHomeCourtInfoVisible(true);
  };

  const handleSelectHomeCourt = () => {
    setHomeCourtInfoVisible(false);
    setTimeout(() => setHomeCourtSelectorVisible(true), MODAL_HANDOFF_MS);
  };

  const handleHomeCourtSaved = () => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setHomeCourtSelectorVisible(false);
    if (action) setTimeout(action, MODAL_HANDOFF_MS);
  };

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

  const registrationOpen = useMemo(() => ladderRegistrationOpen(ladder), [ladder]);
  const postingClosed = useMemo(() => ladderPostingClosed(ladder), [ladder]);
  const nonParticipant = isSignedIn && !isParticipant;
  const cannotPost = nonParticipant || !registrationOpen || postingClosed;
  const buttonLabel = !registrationOpen
    ? "Registration not open yet"
    : postingClosed
      ? "Posting closed for playoffs"
      : nonParticipant
        ? "Join the ladder to post"
        : "Post a Match";

  const handlePostMatch = () => {
    if (!isSignedIn) {
      navigation.navigate("Login");
      return;
    }
    if (!registrationOpen) {
      showBottomToast("Registration is not open yet", "error");
      return;
    }
    if (postingClosed) {
      showBottomToast(
        "Match posting has closed ahead of the playoffs",
        "error",
      );
      return;
    }
    if (!isParticipant) return;
    requireHomeCourt(() => setPostModalVisible(true));
  };

  const handleAcceptPress = (match: LadderMatch) => {
    if (!isSignedIn) {
      navigation.navigate("Login");
      return;
    }
    if (!isParticipant && !membershipChecking) {
      showBottomToast("Join the ladder to accept a match", "info");
      return;
    }
    requireHomeCourt(() => {
      setSelectedMatch(match);
      setAcceptModalVisible(true);
    });
  };

  const handleMatchGone = (gone: LadderMatch) => {
    setMatches((prev) =>
      prev.filter((m) => m.ladderMatchId !== gone.ladderMatchId),
    );
  };

  const screenLoading =
    membershipChecking || homeCourtLoading || matchesLoading;

  const renderMatches = () => {
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

  if (screenLoading) {
    return (
      <Container testID="ladder-matchmaking">
        <SkeletonButtonWrap testID="matchmaking-post-skeleton">
          <SkeletonWrapper show height={44} width="100%" radius={8} />
        </SkeletonButtonWrap>
        <SkeletonButtonWrap>
          <SkeletonWrapper show height={40} width="100%" radius={8} />
        </SkeletonButtonWrap>
        <List testID="matchmaking-loading">
          {SKELETON_ROWS.map((row) => (
            <SkeletonWrapper
              key={row}
              show
              height={116}
              width="100%"
              radius={10}
            />
          ))}
        </List>
      </Container>
    );
  }

  return (
    <Container testID="ladder-matchmaking">
      <PostButton
        testID="matchmaking-post-match"
        activeOpacity={0.85}
        disabled={cannotPost}
        isDisabled={cannotPost}
        onPress={handlePostMatch}
      >
        <PostButtonText>{buttonLabel}</PostButtonText>
      </PostButton>

      <TabsRow>
        <AllTab
          isActive={selectedDay === ALL_DAYS_KEY}
          activeOpacity={0.8}
          onPress={() => setSelectedDay(ALL_DAYS_KEY)}
          testID="matchmaking-all-tab"
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
          />
        </DayTabsWrap>
      </TabsRow>

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

      <InfoModal
        visible={homeCourtInfoVisible}
        onClose={() => {
          pendingActionRef.current = null;
          setHomeCourtInfoVisible(false);
        }}
        title="Select a home court"
        description="You need to select a home court before you can post or accept matches in this ladder. You only need to do this once, and you can change it once per ladder."
        ctaLabel="Select Home Court"
        onCtaPress={handleSelectHomeCourt}
        icon="location-outline"
        testID="home-court-required-modal"
      />

      {homeCourtSelectorVisible && (
        <SearchCourt
          visible={homeCourtSelectorVisible}
          onClose={() => setHomeCourtSelectorVisible(false)}
          courts={ladderCourts.courtsList}
          selectedCourtKey={homeCourt?.courtId}
          onSelectCourt={(value) =>
            confirmHomeCourt(
              ladderCourts.findSelectableCourt(value),
              handleHomeCourtSaved,
            )
          }
          getCourts={ladderCourts.getCourts}
          addCourt={ladderCourts.submitCourt}
          onCourtsRefreshed={ladderCourts.applyCourts}
          showCountryIcon={false}
          selectAddedCourt={false}
          loading={ladderCourts.courtsLoading}
          emptyListMessage={NO_COURTS_MESSAGE}
        />
      )}
    </Container>
  );
};

export default Matchmaking;

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
