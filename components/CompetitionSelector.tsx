import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import Tag from "./Tag";
import RankSuffix from "./RankSuffix";
import { processCompetitions } from "../helpers/processCompetitions";
import { sortLeaguesByEndDate } from "../helpers/sortedLeaguesByEndDate";
import { NormalizedCompetition } from "../types/competition";
import { COMPETITION_TYPES } from "../schemas/schema";
import { Skeleton } from "moti/skeleton";

const { width: screenWidth } = Dimensions.get("window");
const topOffset = 20;
const leagueNameFontSize = screenWidth <= 400 ? 13 : 15;
const statTitleFontSize = screenWidth <= 405 ? 11 : 13;
const statValueFontSize = screenWidth <= 405 ? 18 : 20;
const cardHeight = 120;
const skeletonColor = ["rgb(5, 26, 51)", "rgb(12, 68, 133)", "rgb(5, 26, 51)"];

interface ProcessedCompetition extends NormalizedCompetition {
  wins?: number;
  userRank?: number;
}

interface CompetitionSelectorProps {
  competitions: NormalizedCompetition[];
  selectedId?: string;
  onSelectCompetition: (competition: NormalizedCompetition) => void;
  profile?: { userId: string };
  loading?: boolean;
}

const CompetitionSelector: React.FC<CompetitionSelectorProps> = ({
  competitions,
  selectedId,
  onSelectCompetition,
  profile,
  loading,
}) => {
  const [processed, setProcessed] = useState<ProcessedCompetition[]>([]);
  const [processingRanks, setProcessingRanks] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const competitionType =
    competitions?.[0]?.type === COMPETITION_TYPES.LEAGUE
      ? COMPETITION_TYPES.LEAGUE
      : COMPETITION_TYPES.TOURNAMENT;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!competitions?.length || !profile) {
        if (!cancelled) setProcessed([]);
        return;
      }

      setProcessingRanks(true);
      try {
        processCompetitions({
          competitions,
          setRankData: (data: ProcessedCompetition[]) => {
            if (!cancelled) setProcessed(Array.isArray(data) ? data : []);
          },
          setRankLoading: () => {},
          profile,
          competitionType,
        });
      } catch (error) {
        console.error("Error processing competitions:", error);
        if (!cancelled) setProcessed(competitions as ProcessedCompetition[]);
      } finally {
        if (!cancelled) setProcessingRanks(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [competitions, profile, competitionType]);

  const sortedCompetitions = React.useMemo(
    () => (Array.isArray(processed) ? sortLeaguesByEndDate(processed) : []),
    [processed],
  );

  useEffect(() => {
    if (sortedCompetitions?.length > 0 && !selectedId) {
      onSelectCompetition(sortedCompetitions[0]);
    }
  }, [sortedCompetitions, selectedId]);

  useEffect(() => {
    if (
      sortedCompetitions?.length > 0 &&
      currentIndex < sortedCompetitions.length
    ) {
      const currentCompetition = sortedCompetitions[currentIndex];
      if (currentCompetition && currentCompetition.id !== selectedId) {
        onSelectCompetition(currentCompetition);
      }
    }
  }, [currentIndex, sortedCompetitions, selectedId]);

  const goToIndex = (index: number) => {
    if (!sortedCompetitions?.length) return;
    const clampedIndex = Math.max(
      0,
      Math.min(index, sortedCompetitions.length - 1),
    );

    flatListRef.current?.scrollToOffset({
      offset: clampedIndex * screenWidth,
      animated: true,
    });
    setCurrentIndex(clampedIndex);
  };

  const renderCompetitionCard = useCallback(
    ({ item }: { item: ProcessedCompetition | null }) => {
      if (!item || loading || processingRanks) {
        return (
          <View style={{ width: screenWidth, alignItems: "center" }}>
            <Skeleton
              width={screenWidth * 0.8}
              height={cardHeight}
              radius={8}
              colors={skeletonColor}
            />
          </View>
        );
      }

      const isSelected = item?.id === selectedId;

      return (
        <View style={{ width: screenWidth, alignItems: "center" }}>
          <Card
            style={{
              width: screenWidth * 0.8,
              height: cardHeight,
              borderColor: isSelected ? "#005b90ff" : "rgb(26, 28, 54)",
              borderWidth: isSelected ? 2 : 1,
            }}
          >
            <View
              style={{
                padding: 6,
                width: "60%",
                justifyContent: "center",
              }}
            >
              <Text style={styles.competitionName}>
                {item.name || "Competition"}
              </Text>
              <Text style={styles.location}>
                {item.location?.courtName || "Unknown court"}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Tag name={item.type || "—"} />
              </View>
            </View>

            <StatsContainer>
              <StatColumn>
                <StatTitle>Wins</StatTitle>
                <StatValue>{item.wins || 0}</StatValue>
              </StatColumn>
              <StatColumn>
                <StatTitle>Rank</StatTitle>
                {item.userRank && item.userRank > 0 ? (
                  <RankSuffix
                    number={item.userRank}
                    numberStyle={{
                      fontSize: statValueFontSize,
                      color: "white",
                      fontWeight: "bold",
                    }}
                    suffixStyle={{ color: "rgba(255,255,255,0.7)" }}
                    style={[]}
                  />
                ) : (
                  <StatValue>—</StatValue>
                )}
              </StatColumn>
            </StatsContainer>
          </Card>
        </View>
      );
    },
    [selectedId, loading, processingRanks],
  );

  const keyExtractor = useCallback(
    (item: ProcessedCompetition | null, idx: number) =>
      item?.id ?? `loading-${idx}`,
    [],
  );

  if (!loading && !processingRanks && !sortedCompetitions?.length) {
    return (
      <Container style={{ marginTop: topOffset }}>
        <NoActivityText>
          No competitions found. Please join or create a competition to add
          scores! 🏟️
        </NoActivityText>
      </Container>
    );
  }

  const displayData =
    sortedCompetitions?.length > 0
      ? sortedCompetitions
      : loading || processingRanks
        ? [null]
        : [];

  return (
    <View style={{ marginTop: topOffset }}>
      <Container>
        <FlatList
          ref={flatListRef}
          horizontal
          data={displayData}
          renderItem={renderCompetitionCard}
          keyExtractor={keyExtractor}
          showsHorizontalScrollIndicator={false}
          snapToInterval={screenWidth}
          decelerationRate="fast"
          snapToAlignment="center"
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(
              e.nativeEvent.contentOffset.x / screenWidth,
            );
            setCurrentIndex(newIndex);
          }}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          style={{ width: screenWidth }}
        />
      </Container>

      <ChevronControls>
        <ChevronButton
          onPress={() => goToIndex(currentIndex - 1)}
          disabled={currentIndex === 0}
          style={{ opacity: currentIndex === 0 ? 0.3 : 1 }}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </ChevronButton>

        {loading || processingRanks ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontSize: 12 }}>
            {currentIndex + 1} of {sortedCompetitions.length}
          </Text>
        )}

        <ChevronButton
          onPress={() => goToIndex(currentIndex + 1)}
          disabled={currentIndex >= sortedCompetitions.length - 1}
          style={{
            opacity: currentIndex >= sortedCompetitions.length - 1 ? 0.3 : 1,
          }}
        >
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </ChevronButton>
      </ChevronControls>
    </View>
  );
};

const Container = styled.View({
  width: "100%",
  height: cardHeight,
  justifyContent: "center",
  alignItems: "center",
});

const ChevronControls = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 40,
  paddingTop: 15,
});

const ChevronButton = styled.TouchableOpacity({
  width: 40,
  height: 40,
  justifyContent: "center",
  alignItems: "center",
  borderRadius: 20,
  backgroundColor: "rgba(0,0,0,0.25)",
});

const Card = styled.View({
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderRadius: 8,
  padding: 12,
  flexDirection: "row",
  justifyContent: "space-between",
  marginHorizontal: 5,
});

const StatsContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
});

const StatColumn = styled.View({
  alignItems: "center",
  paddingHorizontal: 15,
});

const StatTitle = styled.Text({
  fontSize: statTitleFontSize,
  color: "#aaa",
  marginBottom: 4,
});

const StatValue = styled.Text({
  fontSize: statValueFontSize,
  fontWeight: "bold",
  color: "white",
});

const NoActivityText = styled.Text({
  color: "#aaa",
  fontStyle: "italic",
  fontSize: 14,
  textAlign: "center",
});

const styles = StyleSheet.create({
  competitionName: {
    color: "white",
    fontWeight: "bold",
    fontSize: leagueNameFontSize,
    marginBottom: 3,
  },
  location: {
    color: "#ccc",
    fontSize: 10,
    marginBottom: 10,
  },
});

export default React.memo(CompetitionSelector);
