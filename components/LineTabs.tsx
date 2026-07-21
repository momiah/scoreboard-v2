import React, { useEffect, useRef } from "react";
import { ScrollView, LayoutChangeEvent } from "react-native";
import styled from "styled-components/native";

interface Tab<T extends string> {
  key: T;
  label: string;
}

interface LineTabsProps<T extends string> {
  tabs: Tab<T>[];
  activeTab: T;
  onTabPress: (tab: T) => void;
  scrollable?: boolean;
  fontSize?: number;
}

function LineTabs<T extends string>({
  tabs,
  activeTab,
  onTabPress,
  scrollable = false,
  fontSize = 14,
}: LineTabsProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const tabPositionsRef = useRef<Record<string, number>>({});

  // Slide the active tab into view whenever it changes (tree swipes included).
  useEffect(() => {
    if (!scrollable) return;
    const tabX = tabPositionsRef.current[activeTab];
    if (tabX == null) return;
    scrollRef.current?.scrollTo({ x: Math.max(tabX - 40, 0), animated: true });
  }, [activeTab, scrollable]);

  const renderTabs = () =>
    tabs.map((tab) => (
      <TabItem
        key={tab.key}
        isActive={activeTab === tab.key}
        scrollable={scrollable}
        onPress={() => onTabPress(tab.key)}
        onLayout={
          scrollable
            ? (event: LayoutChangeEvent) => {
                tabPositionsRef.current[tab.key] = event.nativeEvent.layout.x;
              }
            : undefined
        }
      >
        <TabText isActive={activeTab === tab.key} fontSize={fontSize}>
          {tab.label}
        </TabText>
      </TabItem>
    ));

  if (scrollable) {
    return (
      <ScrollContainer
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {renderTabs()}
      </ScrollContainer>
    );
  }

  return <Container>{renderTabs()}</Container>;
}

export default LineTabs;

const Container = styled.View({
  flexDirection: "row",
  marginBottom: 20,
  paddingTop: 10,
});

const ScrollContainer = styled.ScrollView({
  flexGrow: 0,
  marginBottom: 20,
  paddingTop: 10,
});

const TabItem = styled.TouchableOpacity<{
  isActive: boolean;
  scrollable: boolean;
}>(({ isActive, scrollable }: { isActive: boolean; scrollable: boolean }) => ({
  flex: scrollable ? undefined : 1,
  paddingHorizontal: scrollable ? 18 : 0,
  borderBottomColor: isActive ? "#00A2FF" : "rgb(9, 33, 62)",
  borderBottomWidth: 2,
  paddingVertical: 10,
  justifyContent: "center",
  alignItems: "center",
}));

const TabText = styled.Text<{ isActive: boolean; fontSize: number }>(
  ({ isActive, fontSize }: { isActive: boolean; fontSize: number }) => ({
    fontSize,
    fontWeight: "bold",
    color: isActive ? "#fff" : "#aaa",
  }),
);
