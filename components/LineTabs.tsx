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
  /** Render this tab's label in gold (e.g. today on the schedule strip). */
  highlightKey?: T;
  /** Scroll this tab into view on mount, independent of the active tab. */
  scrollToKey?: T;
  /** Tabs to mark with a dot (e.g. days the user has a game on). */
  dotKeys?: T[];
}

function LineTabs<T extends string>({
  tabs,
  activeTab,
  onTabPress,
  scrollable = false,
  fontSize = 14,
  highlightKey,
  scrollToKey,
  dotKeys,
}: LineTabsProps<T>) {
  const dotSet = new Set(dotKeys ?? []);
  const scrollRef = useRef<ScrollView>(null);
  const tabPositionsRef = useRef<Record<string, number>>({});
  const didAnchorRef = useRef(false);

  const scrollToTab = (key: string | undefined, animated: boolean) => {
    if (!scrollable || key == null) return;
    const tabX = tabPositionsRef.current[key];
    if (tabX == null) return;
    scrollRef.current?.scrollTo({ x: Math.max(tabX - 40, 0), animated });
  };

  // Slide the active tab into view whenever it changes (tree swipes included).
  useEffect(() => {
    scrollToTab(activeTab, true);
  }, [activeTab, scrollable]);

  // Re-anchor to scrollToKey (e.g. today) when the tab set changes.
  useEffect(() => {
    didAnchorRef.current = false;
  }, [scrollToKey, tabs.length]);

  // Positions are only known once children have laid out; onContentSizeChange
  // fires after that, so anchor there for a reliable initial scroll.
  const handleContentSizeChange = () => {
    if (didAnchorRef.current || scrollToKey == null) return;
    if (tabPositionsRef.current[scrollToKey] == null) return;
    didAnchorRef.current = true;
    scrollToTab(scrollToKey, false);
  };

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
        <TabText
          isActive={activeTab === tab.key}
          isHighlight={tab.key === highlightKey}
          fontSize={fontSize}
        >
          {tab.label}
        </TabText>
        {dotSet.has(tab.key) && <Dot />}
      </TabItem>
    ));

  if (scrollable) {
    return (
      <ScrollContainer
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={handleContentSizeChange}
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

const Dot = styled.View({
  position: "absolute",
  bottom: 4,
  width: 4,
  height: 4,
  borderRadius: 2,
  backgroundColor: "#00A2FF",
});
