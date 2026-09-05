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
  /** Scroll this tab into view on mount/layout, independent of the active tab. */
  scrollToKey?: T;
  /** Render this tab's label in gold (e.g. today on the schedule strip). */
  highlightKey?: T;
}

function LineTabs<T extends string>({
  tabs,
  activeTab,
  onTabPress,
  scrollable = false,
  fontSize = 14,
  scrollToKey,
  highlightKey,
}: LineTabsProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const tabPositionsRef = useRef<Record<string, number>>({});
  const didInitialScrollRef = useRef(false);

  const scrollToTab = (key: string | undefined) => {
    if (!scrollable || key == null) return;
    const tabX = tabPositionsRef.current[key];
    if (tabX == null) return;
    scrollRef.current?.scrollTo({ x: Math.max(tabX - 40, 0), animated: true });
  };

  // Slide the active tab into view whenever it changes (tree swipes included).
  useEffect(() => {
    scrollToTab(activeTab);
  }, [activeTab, scrollable]);

  // Anchor the strip on scrollToKey (e.g. today) once on mount.
  useEffect(() => {
    didInitialScrollRef.current = false;
  }, [scrollToKey]);

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
                if (tab.key === scrollToKey && !didInitialScrollRef.current) {
                  didInitialScrollRef.current = true;
                  scrollToTab(scrollToKey);
                }
              }
            : undefined
        }
      >
        <TabText
          isActive={activeTab === tab.key}
          isHighlight={tab.key === highlightKey}
          fontSize={fontSize}
        >
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

const TabText = styled.Text<{
  isActive: boolean;
  isHighlight?: boolean;
  fontSize: number;
}>(
  ({
    isActive,
    isHighlight,
    fontSize,
  }: {
    isActive: boolean;
    isHighlight?: boolean;
    fontSize: number;
  }) => ({
    fontSize,
    fontWeight: "bold",
    color: isHighlight ? "#FFD700" : isActive ? "#fff" : "#aaa",
  }),
);
