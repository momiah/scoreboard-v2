import React from "react";
import styled from "styled-components/native";

interface Tab<T extends string> {
  key: T;
  label: string;
}

interface LineTabsProps<T extends string> {
  tabs: Tab<T>[];
  activeTab: T;
  onTabPress: (tab: T) => void;
}

function LineTabs<T extends string>({
  tabs,
  activeTab,
  onTabPress,
}: LineTabsProps<T>) {
  return (
    <Container>
      {tabs.map((tab) => (
        <TabItem
          key={tab.key}
          isActive={activeTab === tab.key}
          onPress={() => onTabPress(tab.key)}
        >
          <TabText isActive={activeTab === tab.key}>{tab.label}</TabText>
        </TabItem>
      ))}
    </Container>
  );
}

export default LineTabs;

const Container = styled.View({
  flexDirection: "row",
  marginBottom: 20,
  paddingTop: 10,
});

const TabItem = styled.TouchableOpacity<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    flex: 1,
    borderBottomColor: isActive ? "#00A2FF" : "rgb(9, 33, 62)",
    borderBottomWidth: 2,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  }),
);

const TabText = styled.Text<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    fontSize: 14,
    fontWeight: "bold",
    color: isActive ? "#fff" : "#aaa",
  }),
);
