import React from "react";
import { Dimensions } from "react-native";
import styled from "styled-components/native";

const { width: screenWidth } = Dimensions.get("window");

interface LobbyTabsProps<T extends string> {
  tabs: readonly T[];
  selected: T;
  onSelect: (tab: T) => void;
  testIDPrefix: string;
}

const LobbyTabs = <T extends string>({
  tabs,
  selected,
  onSelect,
  testIDPrefix,
}: LobbyTabsProps<T>) =>
  tabs.length < 2 ? null : (
    <Tabs>
      {tabs.map((tab) => (
        <TabButton
          key={tab}
          isSelected={selected === tab}
          activeOpacity={0.85}
          onPress={() => onSelect(tab)}
          testID={`${testIDPrefix}-${tab}`}
        >
          <TabText>{tab}</TabText>
        </TabButton>
      ))}
    </Tabs>
  );

export default LobbyTabs;

const Tabs = styled.View({
  flexDirection: "row",
  gap: 10,
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 6,
});

const TabButton = styled.TouchableOpacity<{ isSelected: boolean }>(
  ({ isSelected }: { isSelected: boolean }) => ({
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: isSelected ? 2 : 1,
    borderColor: isSelected ? "#00A2FF" : "white",
  }),
);

const TabText = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 12 : 14,
});
