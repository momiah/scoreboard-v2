import React, { useContext, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";

import { LADDER_MATCH_STATUS } from "@shared";
import type { LadderMatch } from "@shared/types";
import { LadderContext } from "../../../context/LadderContext";
import { UserContext } from "../../../context/UserContext";
import { useLadderMatchCancellation } from "../../../hooks/useLadderMatchCancellation";
import { formatMatchDateShort } from "../../../helpers/ladderMatchTime";
import { SkeletonWrapper } from "../../../components/Skeletons/SkeletonComponents";

interface LadderPostedMatchesParams {
  ladderId: string;
}

const SKELETON_ROWS = [0, 1, 2];

const LadderPostedMatches: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, LadderPostedMatchesParams>, string>>();
  const { ladderId } = route.params;
  const { subscribeToLadderMatches } = useContext(LadderContext);
  const { currentUser } = useContext(UserContext);
  const { cancelPostedMatch } = useLadderMatchCancellation();
  const userId: string | undefined = currentUser?.userId;

  const [matches, setMatches] = useState<LadderMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    return subscribeToLadderMatches(
      ladderId,
      (all) => {
        setMatches(all);
        setLoading(false);
      },
      () => {
        setMatches([]);
        setLoading(false);
      },
    );
  }, [ladderId, subscribeToLadderMatches]);

  const postedMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          match.matchStatus === LADDER_MATCH_STATUS.POSTED &&
          !!userId &&
          (match.participants ?? []).includes(userId),
      ),
    [matches, userId],
  );

  const renderContent = () => {
    if (loading) {
      return (
        <List testID="posted-matches-loading">
          {SKELETON_ROWS.map((row) => (
            <SkeletonWrapper key={row} show height={72} width="100%" radius={10} />
          ))}
        </List>
      );
    }
    if (postedMatches.length === 0) {
      return (
        <EmptyState testID="posted-matches-empty">
          <EmptyTitle>No posted matches</EmptyTitle>
          <EmptyBody>
            Matches you post in Matchmaking show here until someone accepts
            them.
          </EmptyBody>
        </EmptyState>
      );
    }
    return (
      <List testID="posted-matches-list">
        {postedMatches.map((match) => (
          <Row
            key={match.ladderMatchId}
            testID={`posted-match-${match.ladderMatchId}`}
          >
            <RowText>
              <CourtName numberOfLines={1}>
                {match.court?.courtName ?? "Court"}
              </CourtName>
              <RowDetail>
                {formatMatchDateShort(match.matchDate)} ·{" "}
                {match.matchTime?.start} · Best of {match.bestOf}
              </RowDetail>
            </RowText>
            <CancelButton
              activeOpacity={0.85}
              onPress={() => cancelPostedMatch({ ladderId, match })}
              testID={`posted-match-cancel-${match.ladderMatchId}`}
            >
              <CancelText>Cancel</CancelText>
            </CancelButton>
          </Row>
        ))}
      </List>
    );
  };

  return (
    <Container>
      <Header>
        <BackButton
          onPress={() => navigation.goBack()}
          testID="posted-matches-back"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </BackButton>
        <HeaderTitle>Current Posted Matches</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>
      {renderContent()}
    </Container>
  );
};

export default LadderPostedMatches;

const Container = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  padding: 20,
});

const Header = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 30,
});

const BackButton = styled.TouchableOpacity({});

const HeaderTitle = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const List = styled.View({
  gap: 12,
});

const Row = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  padding: 14,
  borderRadius: 10,
  backgroundColor: "rgba(255, 255, 255, 0.05)",
});

const RowText = styled.View({
  flex: 1,
  gap: 4,
});

const CourtName = styled.Text({
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "600",
});

const RowDetail = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
});

const CancelButton = styled.TouchableOpacity({
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 8,
  backgroundColor: "#FF4B6E",
});

const CancelText = styled.Text({
  color: "#ffffff",
  fontSize: 13,
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
