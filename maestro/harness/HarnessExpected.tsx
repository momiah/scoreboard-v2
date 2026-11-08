import React, { useSyncExternalStore } from "react";
import { Text, View } from "react-native";

export type HarnessExpectedValues = Record<string, string>;

let expected: HarnessExpectedValues = {};
const listeners = new Set<() => void>();

export const setHarnessExpected = (values: HarnessExpectedValues) => {
  expected = values;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const HarnessExpected = () => {
  const values = useSyncExternalStore(subscribe, () => expected);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {Object.entries(values).map(([key, value]) => (
        <Text
          key={key}
          testID={`maestro-expected-${key}`}
          accessibilityLabel={value}
          style={{ color: "#888", fontSize: 8, marginRight: 6 }}
        >
          {value}
        </Text>
      ))}
    </View>
  );
};

export default HarnessExpected;
