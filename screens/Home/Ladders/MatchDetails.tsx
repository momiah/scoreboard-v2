import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Linking } from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  StackActions,
} from "@react-navigation/native";
import type {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import {
  COMPETITION_TYPES,
  LADDER_MATCH_STATUS,
  hasUserCheckedIn,
  isLadderMatchCheckedIn,
} from "@shared";
import type { LadderMatch, LadderType } from "@shared/types";

import { UserContext } from "../../../context/UserContext";
import { LadderContext } from "../../../context/LadderContext";
import ChatRoom from "../../../components/ChatRoom/ChatRoom";
import MatchCancellationBanner from "../../../components/ladder/MatchCancellationBanner";
import MatchRescheduleBanner from "../../../components/ladder/MatchRescheduleBanner";
import PlayoffMatchConfirmBanner from "../../../components/ladder/PlayoffMatchConfirmBanner";
import PlayMatchTwoHere from "../../../components/ladder/PlayMatchTwoHere";
import ResultsCloseBanner from "../../../components/ladder/ResultsCloseBanner";
import { useLadderSeasonClose } from "../../../hooks/useLadderSeasonClose";
import GameLobby from "../../../components/ladder/GameLobby";
import LobbyTabs from "../../../components/ladder/LobbyTabs";
import MatchCard from "../../../components/ladder/MatchCard";
import { LocationVerifierModal } from "../../../components/Modals/MatchCheckinModal";
import { buildCourtMapsUrl } from "../../../helpers/courtMapsUrl";
import { useForfeitLabel } from "../../../helpers/useForfeitLabel";
import { isLadderMatchCalledOff } from "../../../helpers/ladderMatchCancellation";

type LobbyTab = "Chat Room" | "Game Lobby";

interface MatchDetailsParams {
  ladderId: string;
  matchId: string;
  match?: LadderMatch;
  ladderType?: LadderType;
  ladderName?: string;
  /** Scroll to and glow this game on the Game Lobby tab (e.g. from a dispute). */
  highlightGameId?: string;
  highlightColor?: string;
  tab?: LobbyTab;
}

const TABS: LobbyTab[] = ["Chat Room", "Game Lobby"];
const PLAYOFF_TABS: LobbyTab[] = ["Game Lobby"];

const MatchDetails: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, MatchDetailsParams>, string>>();
  const {
    ladderId,
    matchId,
    match: matchParam,
    ladderType,
    ladderName,
    highlightGameId,
    highlightColor,
    tab: initialTab,
  } = route.params;

  const { currentUser } = useContext(UserContext);
  const { subscribeToLadderMatches } = useContext(LadderContext);

  const [match, setMatch] = useState<LadderMatch | null>(matchParam ?? null);
  const [notFound, setNotFound] = useState(false);
  const [secondMatch, setSecondMatch] = useState<LadderMatch | null>(null);
  const [selectedTab, setSelectedTab] = useState<LobbyTab>(
    initialTab ?? "Game Lobby",
  );
  const [checkinModalVisible, setCheckinModalVisible] = useState(false);

  const userId = currentUser?.userId;

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = subscribeToLadderMatches(
        ladderId,
        (matches) => {
          const resolved =
            matches.find((m) => m.ladderMatchId === matchId) ?? null;
          setSecondMatch(
            resolved?.playoffTieId && resolved.playoffLeg === 1
              ? (matches.find(
                  (m) => m.ladderMatchId === `${resolved.playoffTieId}-leg2`,
                ) ?? null)
              : null,
          );
          if (resolved) {
            setMatch(resolved);
            setNotFound(false);
          } else {
            setNotFound(!matchParam);
          }
        },
        (error) => console.error("Error loading match details:", error),
      );
      return unsubscribe;
    }, [ladderId, matchId, matchParam, subscribeToLadderMatches]),
  );

  const calledOffTieId =
    match?.playoffTieId && isLadderMatchCalledOff(match)
      ? match.playoffTieId
      : null;
  useEffect(() => {
    if (!calledOffTieId) return;
    navigation.dispatch(
      StackActions.popTo("PlayoffMatchDetails", {
        ladderId,
        tieId: calledOffTieId,
      }),
    );
  }, [calledOffTieId, ladderId, navigation]);

  const chatPath = useMemo(
    () => ["ladders", ladderId, "ladderMatches", matchId, "chat"],
    [ladderId, matchId],
  );

  const forfeitLabel = useForfeitLabel(match, ladderId);
  const seasonClose = useLadderSeasonClose(ladderId);

  if (notFound || !match) {
    return (
      <Screen>
        <NotFound testID="match-details-not-found">
          <NotFoundText>Match not found.</NotFoundText>
        </NotFound>
      </Screen>
    );
  }

  const isParticipant = !!userId && (match.participants ?? []).includes(userId);

  const openMap = () =>
    Linking.openURL(buildCourtMapsUrl(match.court)).catch((err) =>
      console.error("Error opening Google Maps:", err),
    );

  const isCompleted = match.matchStatus === LADDER_MATCH_STATUS.COMPLETED;
  const isAccepted = match.matchStatus === LADDER_MATCH_STATUS.ACCEPTED;
  const checkedIn = isCompleted || isLadderMatchCheckedIn(match);
  const selfCheckedIn =
    isCompleted || (!!userId && hasUserCheckedIn(match, userId));
  const handleCheckin = () => {
    if (!selfCheckedIn) setCheckinModalVisible(true);
  };
  const handleCheckedIn = () => {};
  const checkinControl =
    isParticipant && (isAccepted || isCompleted)
      ? { checkedIn: selfCheckedIn, onPress: handleCheckin }
      : undefined;

  return (
    <Screen testID="match-details">
      <Header>
        <TopBar>
          {isParticipant ? (
            <IconButton
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("MatchDetailsMenu", {
                  ladderId,
                  matchId,
                  match,
                  ladderType,
                })
              }
              testID="match-details-burger"
            >
              <Ionicons name="menu" size={24} color="#ffffff" />
            </IconButton>
          ) : (
            <MenuSpacer />
          )}
        </TopBar>
        <MatchCard
          match={match}
          flat
          checkin={checkinControl}
          showProgress={!isParticipant}
          onLocationPress={openMap}
          forfeitLabel={forfeitLabel}
          testID="match-details-card"
        />
      </Header>

      {isParticipant ? (
        <ResultsCloseBanner match={match} seasonClose={seasonClose} />
      ) : null}
      <MatchCancellationBanner
        ladderId={ladderId}
        match={match}
        userId={userId}
      />
      <MatchRescheduleBanner
        ladderId={ladderId}
        match={match}
        userId={userId}
      />
      <PlayoffMatchConfirmBanner
        ladderId={ladderId}
        match={match}
        userId={userId}
      />
      <PlayMatchTwoHere
        ladderId={ladderId}
        firstMatch={match}
        secondMatch={secondMatch}
        userId={userId}
      />

      <LobbyTabs
        tabs={match.playoffTieId ? PLAYOFF_TABS : TABS}
        selected={selectedTab}
        onSelect={setSelectedTab}
        testIDPrefix="match-details-tab"
      />

      {selectedTab === "Game Lobby" || match.playoffTieId ? (
        <GameLobby
          ladderId={ladderId}
          ladderName={ladderName}
          seasonClose={seasonClose}
          match={match}
          currentUserId={userId}
          checkedIn={checkedIn}
          highlightGameId={highlightGameId}
          highlightColor={highlightColor}
        />
      ) : (
        <ChatRoom
          competitionId={matchId}
          chatPath={chatPath}
          competitionType={COMPETITION_TYPES.LADDER}
          userRole={isParticipant ? "participant" : "user"}
          endDate={undefined}
          competitionName={`Ladder match at ${match.court?.courtName ?? "court"}`}
          competitionParticipants={match.participants.map((id) => ({
            userId: id,
          }))}
        />
      )}

      <LocationVerifierModal
        visible={checkinModalVisible}
        onClose={() => setCheckinModalVisible(false)}
        match={match}
        ladderId={ladderId}
        currentUserId={userId}
        onCheckedIn={handleCheckedIn}
      />
    </Screen>
  );
};

export default MatchDetails;

const Screen = styled.View({
  flex: 1,
  backgroundColor: "#00152B",
});

const Header = styled.View({
  paddingHorizontal: 20,
  paddingTop: 20,
});

const TopBar = styled.View({
  flexDirection: "row",
  justifyContent: "flex-end",
  marginBottom: 8,
});

const IconButton = styled.TouchableOpacity({
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: "center",
  justifyContent: "center",
});

const MenuSpacer = styled.View({
  height: 40,
});

const NotFound = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const NotFoundText = styled.Text({
  color: "#9fb8c8",
});
