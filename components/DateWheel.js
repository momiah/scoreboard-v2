import React, { useEffect, useMemo, useRef } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatDay = (date) =>
  date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const DateWheel = ({ value, minimumDate, maximumDate, onChange }) => {
  const listRef = useRef(null);

  const days = useMemo(() => {
    const first = startOfDay(minimumDate);
    const last = startOfDay(maximumDate);
    const count = Math.max(
      1,
      Math.round((last.getTime() - first.getTime()) / DAY_MS) + 1,
    );
    return Array.from(
      { length: count },
      (_, index) =>
        new Date(
          first.getFullYear(),
          first.getMonth(),
          first.getDate() + index,
        ),
    );
  }, [minimumDate, maximumDate]);

  const selectedIndex = useMemo(() => {
    const target = startOfDay(value).getTime();
    const index = days.findIndex((day) => day.getTime() === target);
    return index === -1 ? 0 : index;
  }, [days, value]);

  useEffect(() => {
    listRef.current?.scrollToOffset({
      offset: selectedIndex * ITEM_HEIGHT,
      animated: false,
    });
  }, []);

  const handleScrollEnd = (event) => {
    const index = Math.min(
      days.length - 1,
      Math.max(0, Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT)),
    );
    onChange(days[index]);
  };

  const padding = ((VISIBLE_ROWS - 1) / 2) * ITEM_HEIGHT;

  return (
    <View
      testID="date-wheel"
      style={{ height: ITEM_HEIGHT * VISIBLE_ROWS, width: "100%" }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: padding,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.3)",
        }}
      />
      <FlatList
        ref={listRef}
        data={days}
        keyExtractor={(day) => String(day.getTime())}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: padding }}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            accessible={false}
            activeOpacity={0.7}
            testID={`date-wheel-item-${index}`}
            onPress={() => {
              listRef.current?.scrollToOffset({
                offset: index * ITEM_HEIGHT,
                animated: true,
              });
              onChange(item);
            }}
            style={{
              height: ITEM_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 20,
                opacity: index === selectedIndex ? 1 : 0.45,
              }}
            >
              {formatDay(item)}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default DateWheel;
