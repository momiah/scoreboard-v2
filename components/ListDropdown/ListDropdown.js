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
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

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
  maxHeight = 200,
  data,
  defaultOption,
  searchPlaceholder = "Search...",
  notFoundText = "No data found",
  onSelect = () => {},
  save = "key",
  fontFamily,
  loading = false,
  onDropdownOpen,
  label,
  disabled = false,
}) => {
  const [dropdown, setDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const animatedValue = useRef(new Animated.Value(0)).current;
  const dropdownHeight = useRef(maxHeight);
  const inputRef = useRef(null);
  const flatListRef = useRef(null);

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((item) => item.value.toLowerCase().includes(query));
  }, [data, searchQuery]);

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
    }).start(() => {
      setDropdown(false);
      setSearchQuery("");
    });
  }, [animatedValue]);

  const handleSelect = useCallback(
    (key, value) => {
      setSelected(save === "value" ? value : key);
      onSelect();
      slideUp();
    },
    [save, slideUp, onSelect]
  );

  const handleToggle = useCallback(() => {
    if (dropdown) {
      slideUp();
      Keyboard.dismiss();
    } else {
      onDropdownOpen?.();
      slideDown();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [dropdown, onDropdownOpen, slideDown, slideUp]);

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
    <View style={{ marginBottom: 10 }}>
      <Label>{label}</Label>
      {disabled ? (
        <View style={[styles.inputContainer, boxStyles]}>
          <Text style={[styles.input, { color: "#888" }]}>
            {defaultOption?.value || placeholder}
          </Text>
        </View>
      ) : (
        <TouchableOpacity activeOpacity={0.8} onPress={handleToggle}>
          {loading ? (
            <View style={styles.inputContainer}>
              <Text style={{ color: "white" }}>Loading...</Text>
              <ActivityIndicator size="small" color="#666" />
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={[styles.input, inputStyles]}
                value={dropdown ? searchQuery : defaultOption?.value || ""}
                placeholder={dropdown ? searchPlaceholder : placeholder}
                placeholderTextColor="#888"
                editable={dropdown}
                onChangeText={setSearchQuery}
                pointerEvents={dropdown ? "auto" : "none"}
              />
              <Ionicons
                name={dropdown ? "chevron-up" : "chevron-down"}
                size={20}
                color="white"
                style={styles.chevron}
              />
            </View>
          )}
        </TouchableOpacity>
      )}

      {dropdown && (
        <Animated.View
          style={[
            styles.dropdown,
            dropdownStyles,
            { maxHeight: animatedValue },
          ]}
        >
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
            scrollEnabled={true}
            removeClippedSubviews={true}
          />
        </Animated.View>
      )}
    </View>
  );
};

const Label = styled.Text({
  color: "#fff",
  fontWeight: "bold",
  fontSize: 14,
  marginBottom: 5,
});

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    borderColor: "#555",
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  input: {
    flex: 1,
    color: "white",
    fontSize: 14,
    padding: 0,
  },
  chevron: {
    marginLeft: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#555",
    marginTop: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
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
