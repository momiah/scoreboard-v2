import React, { useCallback, useContext, useMemo, useState } from "react";
import { Dimensions, Linking } from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
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
import GameLobby from "../../../components/ladder/GameLobby";
import MatchCard from "../../../components/ladder/MatchCard";
import { LocationVerifierModal } from "../../../components/Modals/MatchCheckinModal";
import { buildCourtMapsUrl } from "../../../helpers/courtMapsUrl";

const { width: screenWidth } = Dimensions.get("window");

type LobbyTab = "Chat Room" | "Game Lobby";

interface MatchDetailsParams {
  ladderId: string;
  matchId: string;
  match?: LadderMatch;
  ladderType?: LadderType;
}

const TABS: LobbyTab[] = ["Chat Room", "Game Lobby"];

const MatchDetails: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, MatchDetailsParams>, string>>();
  const { ladderId, matchId, match: matchParam, ladderType } = route.params;

  const { currentUser } = useContext(UserContext);
  const { subscribeToLadderMatches } = useContext(LadderContext);

  const [match, setMatch] = useState<LadderMatch | null>(matchParam ?? null);
  const [notFound, setNotFound] = useState(false);
  const [selectedTab, setSelectedTab] = useState<LobbyTab>("Game Lobby");
  // Check-in is persisted on the match (a QR handshake). The modal drives it;
  // the card button and Game Lobby derive their state from match.checkIn.
  const [checkinModalVisible, setCheckinModalVisible] = useState(false);

  const userId = currentUser?.userId;

  // Live-subscribe to the match while the screen is focused, so check-ins (and
  // any other change) update the card status and Game Lobby in realtime on
  // every device — no manual refresh needed.
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = subscribeToLadderMatches(
        ladderId,
        (matches) => {
          const resolved =
            matches.find((m) => m.ladderMatchId === matchId) ?? null;
          if (resolved) {
            setMatch(resolved);
            setNotFound(false);
          } else {
            // Missing from the ladder: only "not found" when we had no seed.
            setNotFound(!matchParam);
          }
        },
        (error) => console.error("Error loading match details:", error),
      );
      return unsubscribe;
    }, [ladderId, matchId, matchParam, subscribeToLadderMatches]),
  );

  const chatPath = useMemo(
    () => ["ladders", ladderId, "ladderMatches", matchId, "chat"],
    [ladderId, matchId],
  );

  if (notFound || !match) {
    return (
      <Screen>
        <NotFound testID="match-details-not-found">
          <NotFoundText>Match not found.</NotFoundText>
        </NotFound>
      </Screen>
    );
  }

  const openMap = () =>
    Linking.openURL(buildCourtMapsUrl(match.court)).catch((err) =>
      console.error("Error opening Google Maps:", err),
    );

  const isCompleted = match.matchStatus === LADDER_MATCH_STATUS.COMPLETED;
  const isAccepted = match.matchStatus === LADDER_MATCH_STATUS.ACCEPTED;
  // Match-level: all participants in (drives the Game Lobby lock).
  const checkedIn = isCompleted || isLadderMatchCheckedIn(match);
  // This player's own status (drives the card button → "Checked in" tick, even
  // in doubles while waiting on the others).
  const selfCheckedIn =
    isCompleted || (!!userId && hasUserCheckedIn(match, userId));
  const handleCheckin = () => {
    if (!selfCheckedIn) setCheckinModalVisible(true);
  };
  // The live subscription already reflects the check-in; nothing to refresh.
  const handleCheckedIn = () => {};
  // Check-in only exists once a match is accepted (and stays as a tick when
  // completed). Before that there's no opponent to check in with, so the card
  // shows no check-in control.
  const checkinControl =
    isAccepted || isCompleted
      ? { checkedIn: selfCheckedIn, onPress: handleCheckin }
      : undefined;

  return (
    <Screen testID="match-details">
      <Header>
        <TopBar>
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
        </TopBar>
        <MatchCard
          match={match}
          flat
          checkin={checkinControl}
          onLocationPress={openMap}
          testID="match-details-card"
        />
      </Header>

      <Tabs>
        {TABS.map((tab) => (
          <TabButton
            key={tab}
            isSelected={selectedTab === tab}
            activeOpacity={0.85}
            onPress={() => setSelectedTab(tab)}
            testID={`match-details-tab-${tab}`}
          >
            <TabText>{tab}</TabText>
          </TabButton>
        ))}
      </Tabs>

      {selectedTab === "Game Lobby" ? (
        <GameLobby match={match} currentUserId={userId} checkedIn={checkedIn} />
      ) : (
        <ChatRoom
          competitionId={matchId}
          chatPath={chatPath}
          competitionType={COMPETITION_TYPES.LADDER}
          userRole="participant"
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

const Tabs = styled.View({
  flexDirection: "row",
  gap: 10,
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 6,
});

const TabButton = styled.TouchableOpacity<{ isSelected: boolean }>(
  ({ isSelected }: { isSelected: boolean }) => ({
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: isSelected ? 2 : 1,
    borderColor: isSelected ? "#00A2FF" : "white",
  }),
);

const TabText = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 12 : 14,
});

const NotFound = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const NotFoundText = styled.Text({
  color: "#9fb8c8",
});
