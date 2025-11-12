import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
  useRef,
} from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { UserContext } from "../../context/UserContext";
import { processLeagues } from "../../helpers/processedProfileLeagues";
import { calculateCompetitionStatus } from "../../helpers/calculateCompetitionStatus";
import { sortLeaguesByEndDate } from "../../helpers/sortedLeaguesByEndDate";
import Tag from "../Tag";
import RankSuffix from "../RankSuffix";

const { width: screenWidth } = Dimensions.get("window");
const topOffset = 20;

const QuickAddLeagueSelector = ({
  profile,
  selectedLeagueId,
  onSelectLeague,
  userLeagues,
  onSelectionStateChange,
}) => {
  const [processed, setProcessed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!userLeagues?.length || !profile) {
        if (!cancelled) setProcessed([]);
        return;
      }

      setLoading(true);
      try {
        processLeagues({
          userLeagues,
          setRankData: (data) => {
            if (!cancelled) setProcessed(Array.isArray(data) ? data : []);
          },
          setRankLoading: () => {},
          profile,
        });
      } catch (error) {
        console.error("Error processing leagues:", error);
        if (!cancelled) setProcessed([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [userLeagues, profile]);

  const sortedLeagues = useMemo(
    () => (Array.isArray(processed) ? sortLeaguesByEndDate(processed) : []),
    [processed]
  );

  useEffect(() => {
    if (
      sortedLeagues?.length > 0 &&
      currentIndex >= 0 &&
      currentIndex < sortedLeagues.length
    ) {
      const currentLeague = sortedLeagues[currentIndex];
      if (currentLeague && currentLeague.id !== selectedLeagueId) {
        if (onSelectionStateChange) onSelectionStateChange(true);
        handleSelect(currentLeague);
        setTimeout(() => {
          if (onSelectionStateChange) onSelectionStateChange(false);
        }, 100);
      }
    }
  }, [
    currentIndex,
    sortedLeagues,
    selectedLeagueId,
    onSelectionStateChange,
    handleSelect,
  ]);

  useEffect(() => {
    if (sortedLeagues?.length > 0 && !selectedLeagueId) {
      const firstLeague = sortedLeagues[0];
      if (firstLeague) {
        if (onSelectionStateChange) onSelectionStateChange(true);
        handleSelect(firstLeague);
        setCurrentIndex(0);
        setTimeout(() => {
          if (onSelectionStateChange) onSelectionStateChange(false);
        }, 100);
      }
    }
  }, [sortedLeagues, selectedLeagueId, onSelectionStateChange, handleSelect]);

  const keyExtractor = useCallback(
    (item, idx) => item?.id ?? `league-${idx}`,
    []
  );

  const handleSelect = useCallback(
    (league) => {
      if (league) onSelectLeague?.(league);
    },
    [onSelectLeague]
  );

  const goToIndex = (index) => {
    if (!sortedLeagues?.length) return;
    const clampedIndex = Math.max(0, Math.min(index, sortedLeagues.length - 1));

    if (onSelectionStateChange) onSelectionStateChange(true);

    flatListRef.current?.scrollToOffset({
      offset: clampedIndex * screenWidth,
      animated: true,
    });
    setCurrentIndex(clampedIndex);
  };

  const renderLeagueCard = useCallback(
    ({ item }) => {
      if (!item) return null;

      const isSelected = item?.id === selectedLeagueId;
      const isOwner = item?.leagueOwner?.userId === profile?.userId;
      const isAdmin =
        !isOwner &&
        item?.leagueAdmins?.some((a) => a?.userId === profile?.userId);

      return (
        <View style={{ width: screenWidth, alignItems: "center" }}>
          <Card
            style={{
              width: screenWidth * 0.8,
              height: 120,
              borderColor: isSelected ? "#005b90ff" : "rgb(26, 28, 54)",
              borderWidth: isSelected ? 2 : 1,
            }}
          >
            {(isOwner || isAdmin) && (
              <View style={{ position: "absolute", top: 6, right: 6 }}>
                <Tag
                  name={isOwner ? "Owner" : "Admin"}
                  color={isOwner ? "rgb(3, 16, 31)" : "#16181B"}
                  iconColor={isOwner ? "#FFD700" : "#00A2FF"}
                  iconSize={9}
                  fontSize={8}
                  icon={isOwner ? "star-outline" : "checkmark-circle-outline"}
                  iconPosition="right"
                  bold
                />
              </View>
            )}

            <View
              style={{
                padding: 6,
                width: "60%",
                justifyContent: "center",
              }}
            >
              <Text style={styles.leagueName}>
                {item.leagueName || "League"}
              </Text>
              <Text style={styles.location}>
                {item.location?.courtName || "Unknown court"}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Tag name={item.leagueType || "—"} />
              </View>
            </View>

            <StatsContainer>
              <StatColumn>
                <StatTitle>Wins</StatTitle>
                <StatValue>{item.wins || 0}</StatValue>
              </StatColumn>
              <StatColumn>
                <StatTitle>Rank</StatTitle>
                {item.userRank > 0 ? (
                  <RankSuffix
                    number={item.userRank}
                    numberStyle={{ fontSize: 18, color: "white" }}
                    suffixStyle={{ color: "rgba(255,255,255,0.7)" }}
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
    [selectedLeagueId, profile?.userId]
  );

  if (loading) {
    return (
      <Container style={{ marginTop: topOffset }}>
        <ActivityIndicator color="#fff" size="small" />
      </Container>
    );
  }

  if (!sortedLeagues?.length) {
    return (
      <Container style={{ marginTop: topOffset }}>
        <NoActivityText>No leagues found 🏟️</NoActivityText>
      </Container>
    );
  }

  return (
    <View style={{ marginTop: topOffset }}>
      {/* Carousel */}
      <Container>
        <FlatList
          ref={flatListRef}
          horizontal
          data={sortedLeagues}
          renderItem={renderLeagueCard}
          keyExtractor={keyExtractor}
          showsHorizontalScrollIndicator={false}
          snapToInterval={screenWidth}
          decelerationRate="fast"
          snapToAlignment="center"
          onScrollBeginDrag={() => {
            if (onSelectionStateChange) onSelectionStateChange(true);
          }}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(
              e.nativeEvent.contentOffset.x / screenWidth
            );
            setCurrentIndex(newIndex);
            setTimeout(() => {
              if (onSelectionStateChange) onSelectionStateChange(false);
            }, 100);
          }}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          style={{ width: screenWidth }}
        />
      </Container>

      {/* Chevron Controls */}
      <ChevronControls>
        <ChevronButton
          onPress={() => goToIndex(currentIndex - 1)}
          disabled={currentIndex === 0}
          style={{ opacity: currentIndex === 0 ? 0.3 : 1 }}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </ChevronButton>

        <Text style={{ color: "#fff", fontSize: 12 }}>
          {currentIndex + 1} of {sortedLeagues.length}
        </Text>

        <ChevronButton
          onPress={() => goToIndex(currentIndex + 1)}
          disabled={currentIndex >= sortedLeagues.length - 1}
          style={{
            opacity: currentIndex >= sortedLeagues.length - 1 ? 0.3 : 1,
          }}
        >
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </ChevronButton>
      </ChevronControls>
    </View>
  );
};

const statTitleFontSize = screenWidth <= 405 ? 11 : 13;
const statValueFontSize = screenWidth <= 405 ? 18 : 20;
const leagueNameFontSize = screenWidth <= 400 ? 13 : 15;

const Container = styled.View({
  width: "100%",
  height: 120,
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

const styles = {
  leagueName: {
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
};

export default React.memo(QuickAddLeagueSelector);
