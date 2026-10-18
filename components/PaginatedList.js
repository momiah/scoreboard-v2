import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { FlatList, RefreshControl, ActivityIndicator, Alert } from "react-native";
import styled from "styled-components/native";
import debounce from "lodash.debounce";
import Ionicons from "@expo/vector-icons/Ionicons";
import LoadingOverlay from "./LoadingOverlay";

/**
 * Reusable paginated list shell (numbered pagination + optional search),
 * extracted from the Home AllPlayers directory so ladder standings can reuse
 * the same UX. `fetchPage` abstracts the data source — a server query for the
 * global directory, or an in-memory slice for a ladder's participants/teams.
 *
 * @param {{
 *   fetchPage: (page: number, pageSize: number, search: string) =>
 *     Promise<{ items: any[]; totalItems: number; totalPages: number }>,
 *   renderItem: import("react-native").ListRenderItem<any>,
 *   keyExtractor: (item: any, index: number) => string,
 *   pageSize?: number,
 *   searchable?: boolean,
 *   searchPlaceholder?: string,
 *   countLabel?: (total: number) => string,
 *   emptyText?: string,
 *   listProps?: object,
 * }} props
 */
const PaginatedList = ({
  fetchPage,
  renderItem,
  keyExtractor,
  pageSize = 25,
  searchable = true,
  searchPlaceholder = "Search...",
  countLabel,
  emptyText = "No results",
  listProps = {},
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const loadPage = useCallback(
    async (page = 1, searchParam = "") => {
      try {
        setLoading(true);
        const result = await fetchPage(page, pageSize, searchParam);
        setTotalItems(result.totalItems);
        setTotalPages(result.totalPages);
        setItems(result.items);
        setCurrentPage(page);
        setIsSearching(!!searchParam);
      } catch (error) {
        console.error("[PaginatedList] Failed to fetch page:", error);
        Alert.alert("Refresh failed", "Could not update the list");
      } finally {
        setLoading(false);
      }
    },
    [fetchPage, pageSize],
  );

  const debouncedSearch = useMemo(
    () =>
      debounce(async (value) => {
        setIsTyping(false);
        try {
          await loadPage(1, value.trim());
        } catch (error) {
          console.error("[PaginatedList] Search error:", error);
          Alert.alert("Search failed", "Could not search the list");
        }
      }, 600),
    [loadPage],
  );

  const handleSearch = useCallback(
    (value) => {
      setSearchQuery(value);
      setIsTyping(true);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setSearchQuery("");
      await loadPage(1);
    } finally {
      setRefreshing(false);
    }
  }, [loadPage]);

  const handlePageChange = useCallback(
    (page) => {
      if (page >= 1 && page <= totalPages && !loading) {
        loadPage(page, searchQuery);
      }
    },
    [totalPages, loading, loadPage, searchQuery],
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const renderPagination = () => {
    if (isSearching && totalPages <= 1) return null;

    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

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
    <Container>
      {countLabel && (
        <CountContainer>
          {loading && !isTyping ? (
            <ActivityIndicator size="small" color="#00A2FF" />
          ) : (
            <CountText>{countLabel(totalItems)}</CountText>
          )}
        </CountContainer>
      )}

      {searchable && (
        <SearchInput
          placeholder={searchPlaceholder}
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={handleSearch}
          editable={!loading}
          style={{ opacity: loading ? 0.4 : 1 }}
          autoCorrect={false}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
        />
      )}

      {!loading && items.length === 0 && <EmptyState>{emptyText}</EmptyState>}

      <ListContainer>
        <LoadingOverlay visible={loading && !isTyping} />
        <FlatList
          data={items}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
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
          {...listProps}
        />
      </ListContainer>
    </Container>
  );
};

const Container = styled.View({
  flex: 1,
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

const CountContainer = styled.View({
  alignSelf: "flex-end",
  paddingRight: 20,
  height: 16,
  justifyContent: "center",
});

const CountText = styled.Text({
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

export default PaginatedList;
