import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from "react";
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import styled from "styled-components/native";
import MedalDisplay from "../../components/performance/MedalDisplay";
import CourtChampsLogo from "../../assets/court-champ-logo-icon.png";
import { GameContext } from "../../context/GameContext";
import { UserContext } from "../../context/UserContext";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-ico-flags";
import { CircleSkeleton } from "../../components/Skeletons/UserProfileSkeleton";
import { useImageLoader } from "../../utils/imageLoader";
import { SKELETON_THEMES } from "../../components/Skeletons/skeletonConfig";
import debounce from "lodash.debounce";
import Ionicons from "@expo/vector-icons/Ionicons";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import LoadingOverlay from "../../components/LoadingOverlay";

const iconSize = 40;

const AllPlayers = () => {
  const { findRankIndex } = useContext(GameContext);
  const { getAllUsersPaginated, rankSortingPaginated } =
    useContext(UserContext);
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const PAGE_SIZE = 25;

  const { imageLoaded, handleImageLoad, handleImageError } = useImageLoader();

  const fetchUsers = useCallback(
    async (page = 1, searchParam = "") => {
      try {
        setLoading(true);
        const { users, totalUsers, totalPages } = await getAllUsersPaginated(
          page,
          PAGE_SIZE,
          searchParam,
        );
        setTotalUsers(totalUsers);
        setTotalPages(totalPages);
        setUsers(users);
        setCurrentPage(page);
        setIsSearching(!!searchParam);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        Alert.alert("Refresh failed", "Could not update player list");
      } finally {
        setLoading(false);
      }
    },
    [getAllUsersPaginated],
  );

  const debouncedSearch = useMemo(
    () =>
      debounce(async (value) => {
        try {
          if (value.trim()) {
            await fetchUsers(1, value.trim());
          } else {
            await fetchUsers(1);
          }
        } catch (error) {
          console.error("Search error:", error);
          Alert.alert("Search failed", "Could not find players");
        }
      }, 300),
    [fetchUsers],
  );

  const handleSearch = useCallback(
    (value) => {
      setSearchQuery(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setSearchQuery("");
      await fetchUsers(1);
    } finally {
      setRefreshing(false);
    }
  }, [fetchUsers]);

  const handlePageChange = useCallback(
    (page) => {
      if (page >= 1 && page <= totalPages && !loading) {
        fetchUsers(page, searchQuery);
      }
    },
    [totalPages, loading, fetchUsers, searchQuery],
  );

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchUsers(1);
    };
    loadInitialData();
  }, [getAllUsersPaginated]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

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

  const renderPlayer = useCallback(
    ({ item: player, index }) => {
      const playerXp = player.profileDetail.XP;
      const rankLevel = findRankIndex(playerXp) + 1;
      const winRatio =
        player.profileDetail.numberOfWins /
        (player.profileDetail.numberOfLosses || 1);

      const displayName = formatDisplayName(player);

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
            <PlayerName>{displayName}</PlayerName>
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
    ],
  );

  const renderPagination = () => {
    if (isSearching && totalPages <= 1) return null;

    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PageButton
          key={i}
          onPress={() => handlePageChange(i)}
          disabled={i === currentPage}
        >
          {i === currentPage ? (
            <CirclePageContainer>
              <PageTextInCircle>{i}</PageTextInCircle>
            </CirclePageContainer>
          ) : (
            <PageText selected={false}>{i}</PageText>
          )}
        </PageButton>,
      );
    }

    return (
      <PaginationContainer>
        {/* First Page */}
        <PageButton
          onPress={() => handlePageChange(1)}
          disabled={currentPage === 1 || loading}
        >
          <Ionicons
            name="play-skip-back"
            size={18}
            color={currentPage === 1 || loading ? "#666" : "white"}
          />
        </PageButton>

        {/* Previous Page */}
        <PageButton
          onPress={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={currentPage === 1 || loading ? "#666" : "white"}
          />
        </PageButton>

        {pages}

        {/* Next Page */}
        <PageButton
          onPress={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={currentPage === totalPages || loading ? "#666" : "white"}
          />
        </PageButton>

        {/* Last Page */}
        <PageButton
          onPress={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages || loading}
        >
          <Ionicons
            name="play-skip-forward"
            size={18}
            color={currentPage === totalPages || loading ? "#666" : "white"}
          />
        </PageButton>
      </PaginationContainer>
    );
  };

  return (
    <TableContainer>
      <PlayerCountContainer>
        {loading ? (
          <ActivityIndicator size="small" color="#00A2FF" />
        ) : (
          <PlayerCountText>{totalUsers} players</PlayerCountText>
        )}
      </PlayerCountContainer>
      <SearchInput
        placeholder="Search players..."
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={handleSearch}
        editable={!loading}
        style={{ opacity: loading ? 0.4 : 1 }}
      />
      {!loading && users.length === 0 && (
        <EmptyState>No players found</EmptyState>
      )}
      <ListContainer>
        <LoadingOverlay visible={loading} />
        <FlatList
          data={users}
          contentContainerStyle={{ paddingBottom: 30 }}
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
          ListFooterComponent={totalPages > 1 ? renderPagination : null}
        />
      </ListContainer>
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

const ListContainer = styled.View({
  flex: 1,
  position: "relative",
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

const PlayerCountContainer = styled.View({
  alignSelf: "flex-end",
  paddingRight: 20,
  height: 16,
  justifyContent: "center",
});

const PlayerCountText = styled.Text({
  color: "white",
  fontSize: 10,
  fontWeight: "bold",
  fontStyle: "italic",
});

const PaginationContainer = styled.View({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
});

const PageButton = styled.TouchableOpacity({
  padding: 10,
  marginHorizontal: 5,
});

const PageText = styled.Text(({ selected }) => ({
  color: selected ? "#00A2FF" : "white",
  fontWeight: selected ? "bold" : "normal",
  fontSize: 14,
}));

const CirclePageContainer = styled.View({
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: "#00A2FF",
  justifyContent: "center",
  alignItems: "center",
});

const PageTextInCircle = styled.Text({
  color: "white",
  fontWeight: "bold",
  fontSize: 14,
});

export default AllPlayers;
