import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  View,
  Text,
} from "react-native";
import styled from "styled-components/native";
import MedalDisplay from "../../components/performance/MedalDisplay";
import CourtChampsLogo from "../../assets/court-champ-logo-icon.png";
import { GameContext } from "../../context/GameContext";
import { UserContext } from "../../context/UserContext";
import { useNavigation } from "@react-navigation/native";
import AllPlayerSkeleton from "../../components/Skeletons/AllPlayerSkeleton";
import Icon from "react-native-ico-flags";
import { CircleSkeleton } from "../../components/Skeletons/UserProfileSkeleton";
import { useImageLoader } from ".././../utils/imageLoader";
import { SKELETON_THEMES } from "../../components/Skeletons/skeletonConfig";
const iconSize = 40;

const AllPlayers = () => {
  const { findRankIndex } = useContext(GameContext);
  const { getAllUsers, rankSorting } = useContext(UserContext);
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [originalUsers, setOriginalUsers] = useState([]);
  const [sortedUsers, setSortedUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const { imageLoaded, handleImageLoad, handleImageError } = useImageLoader();

  const fetchUsers = async () => {
    try {
      const users = await getAllUsers();
      setTotalUsers(users.length);
      const sorted = rankSorting(users).map((user, index) => ({
        ...user,
        globalRank: index + 1,
      }));
      setOriginalUsers(sorted);
      setSortedUsers(sorted);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      Alert.alert("Refresh failed", "Could not update player list");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchUsers();
    } finally {
      setRefreshing(false);
    }
  }, [fetchUsers]);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchUsers();
    };
    loadInitialData();
  }, [getAllUsers]);

  const getRankSuffix = (rank) => {
    const lastTwo = rank % 100;
    if (lastTwo >= 11 && lastTwo <= 13) return "th";
    switch (rank % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    try {
      if (value.trim()) {
        const searchTerm = value.toLowerCase();
        const filtered = originalUsers.filter((user) =>
          user.username.toLowerCase().includes(searchTerm)
        );
        setSortedUsers(filtered);
      } else {
        setSortedUsers(originalUsers);
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const renderPlayer = useCallback(
    ({ item: player, index }) => {
      const playerXp = player.profileDetail.XP;
      const rankLevel = findRankIndex(playerXp) + 1;

      return (
        <PlayerRow
          key={player.userId}
          onPress={() => {
            navigation.navigate("UserProfile", {
              userId: player.userId,
            });
          }}
        >
          <CircleSkeleton
            show={!imageLoaded}
            size={iconSize}
            config={SKELETON_THEMES.dark}
          >
            <Avatar
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ opacity: imageLoaded ? 1 : 0 }}
              source={
                player?.profileImage
                  ? { uri: player.profileImage }
                  : CourtChampsLogo
              }
            />
          </CircleSkeleton>
          <TableCell>
            <Rank>
              {player.globalRank}
              <Suffix>{getRankSuffix(player.globalRank)}</Suffix>
            </Rank>
          </TableCell>
          <PlayerNameCell>
            <PlayerName>{player.username}</PlayerName>
          </PlayerNameCell>
          <TableCell>
            <Icon name={player.location.countryCode} height="20" width="20" />
          </TableCell>
          <TableCell>
            <StatTitle>Wins</StatTitle>
            <Stat>{player.profileDetail.numberOfWins}</Stat>
          </TableCell>
          <TableCell>
            <MedalDisplay xp={playerXp.toFixed(0)} size={iconSize} />
            <RankLevel>{rankLevel}</RankLevel>
          </TableCell>
        </PlayerRow>
      );
    },
    [
      findRankIndex,
      navigation,
      loading,
      imageLoaded,
      handleImageLoad,
      handleImageError,
    ]
  );

  return (
    <TableContainer>
      {loading && (
        <LoadingContainer>
          <ActivityIndicator size="large" color="#00A2FF" />
        </LoadingContainer>
      )}
      <Text
        style={{
          color: "white",
          fontSize: 10,
          alignSelf: "flex-end",
          paddingRight: 20,
          fontWeight: "bold",
          fontStyle: "italic",
        }}
      >
        {totalUsers} players
      </Text>
      <SearchInput
        placeholder="Search players..."
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={handleSearch}
      />
      {!loading && sortedUsers.length === 0 && (
        <EmptyState>No players found</EmptyState>
      )}
      <FlatList
        data={sortedUsers}
        renderItem={renderPlayer}
        keyExtractor={(player) => `${player.userId}-${player.globalRank}`}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="white"
            colors={["white"]}
            progressBackgroundColor="#00A2FF"
          />
        }
      />
    </TableContainer>
  );
};

const TableContainer = styled.View({
  paddingTop: 20,
  flex: 1,
  backgroundColor: " rgb(3, 16, 31)",
});

const Suffix = styled.Text({
  fontSize: 10,
  color: "#00A2FF",
});

const EmptyState = styled.Text({
  color: "white",
  textAlign: "center",
  padding: 20,
});

const SearchInput = styled.TextInput({
  height: 40,
  margin: 15,
  padding: 10,
  color: "white",
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "1px solid rgb(15, 53, 99)",
});

const PlayerRow = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  borderTopWidth: 1,
  borderColor: "1px solid rgb(9, 33, 62)",
  borderRadius: 10,
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const PlayerNameCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 15,
  paddingBottom: 15,
  width: 110,
});

const Avatar = styled.Image({
  width: iconSize,
  height: iconSize,
  borderRadius: 30,
  borderWidth: 1,
  borderColor: "#00A2FF",
  marginBottom: 5,
});

const PlayerName = styled.Text({
  fontSize: 13,
  fontWeight: "bold",
  color: "white",
});

const Rank = styled.Text({
  fontSize: 13,
  color: "#00A2FF",
  fontWeight: "bold",
});

const StatTitle = styled.Text({
  fontSize: 11,
  color: "#aaa",
});

const Stat = styled.Text({
  fontSize: 13,
  fontWeight: "bold",
  color: "white",
});

const RankLevel = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
  color: "white",
});

const LoadingContainer = styled.View({
  position: "absolute",
  top: 10, // Adjusts position near the top
  left: 0,
  right: 0,
  alignItems: "center",
  zIndex: 10, // Keeps it above other elements
});

export default AllPlayers;
