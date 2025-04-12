import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  TextInput,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

// Memoized list item component to prevent unnecessary re-renders
const MemoizedListItem = React.memo(
  ({ item, onPress, styles, fontFamily, disabled }) => (
    <TouchableOpacity
      style={[styles.option, disabled && styles.disabledoption]}
      onPress={onPress}
    >
      <Text style={[{ fontFamily }, styles.dropdownTextStyles]}>
        {item.value}
      </Text>
    </TouchableOpacity>
  )
);

const ListDropdown = ({
  setSelected,
  placeholder,
  boxStyles,
  inputStyles,
  dropdownStyles,
  dropdownTextStyles = {},
  maxHeight = 200,
  data,
  defaultOption,
  search = true,
  searchPlaceholder = "Search...",
  notFoundText = "No data found",
  disabledItemStyles,
  disabledTextStyles,
  onSelect = () => {},
  save = "key",
  fontFamily,
  loading = false,
  onDropdownOpen,
}) => {
  const [dropdown, setDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const animatedValue = useRef(new Animated.Value(0)).current;
  const dropdownHeight = useRef(maxHeight);
  const flatListRef = useRef(null);

  // Memoize filtered data to prevent unnecessary recalculations
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((item) => item.value.toLowerCase().includes(query));
  }, [data, searchQuery]);

  // Debounce search input
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // Animation handlers
  const slideDown = useCallback(() => {
    setDropdown(true);
    Animated.timing(animatedValue, {
      toValue: dropdownHeight.current,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [animatedValue]);

  const slideUp = useCallback(() => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setDropdown(false));
  }, [animatedValue]);

  // Handle item selection
  const handleSelect = useCallback(
    (key, value) => {
      setSelected(save === "value" ? value : key);
      onSelect();
      slideUp();
    },
    [save, slideUp, onSelect]
  );

  // Toggle dropdown visibility
  const toggleDropdown = useCallback(() => {
    if (!dropdown) {
      Keyboard.dismiss();
      onDropdownOpen?.();
      slideDown();
    } else {
      slideUp();
    }
  }, [dropdown, onDropdownOpen, slideDown, slideUp]);

  // Render optimized list items
  const renderItem = useCallback(
    ({ item }) => {
      const key = item.key || item.value;
      const value = item.value;
      const disabled = item.disabled || false;

      return (
        <MemoizedListItem
          item={item}
          onPress={disabled ? null : () => handleSelect(key, value)}
          styles={styles}
          fontFamily={fontFamily}
          disabled={disabled}
        />
      );
    },
    [handleSelect, fontFamily]
  );

  return (
    <View>
      <TouchableOpacity
        style={[styles.wrapper, boxStyles]}
        onPress={toggleDropdown}
      >
        <Text style={[{ fontFamily }, inputStyles]}>
          {defaultOption?.value || placeholder || "Select option"}
        </Text>
        <Ionicons
          name={dropdown ? "chevron-up" : "chevron-down"}
          size={20}
          color="white"
        />
      </TouchableOpacity>

      {dropdown && (
        <Animated.View
          style={[
            styles.dropdown,
            dropdownStyles,
            { maxHeight: animatedValue },
          ]}
        >
          {search && (
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#666" />
              <TextInput
                placeholder={searchPlaceholder}
                onChangeText={handleSearch}
                style={[styles.searchInput, { fontFamily }]}
                placeholderTextColor="#888"
              />
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#666" />
              <Text style={styles.loadingText}>Loading cities...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={filteredData}
              renderItem={renderItem}
              keyExtractor={(item) => item.key || item.value}
              initialNumToRender={20}
              maxToRenderPerBatch={30}
              windowSize={10}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{notFoundText}</Text>
                </View>
              }
              getItemLayout={(data, index) => ({
                length: 40,
                offset: 40 * index,
                index,
              })}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            />
          )}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#555",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#555",
    marginTop: 8,
    backgroundColor: "#2a2a2a",
    overflow: "hidden",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  searchInput: {
    flex: 1,
    color: "white",
    marginLeft: 8,
    fontSize: 14,
    padding: 0,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  disabledoption: {
    opacity: 0.5,
    backgroundColor: "#333",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#888",
    marginTop: 8,
  },
  emptyContainer: {
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    color: "#888",
  },
  dropdownTextStyles: {
    color: "white",
    fontSize: 14,
  },
});

export default React.memo(ListDropdown);
