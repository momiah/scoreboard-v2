import React, { useState } from "react";
import { ScrollView, Dimensions } from "react-native";
import styled from "styled-components/native";

import PlayerPerformance from "./performance/PlayerPerformance";
import TeamPerformance from "./performance/TeamPerformance";
import LeaguePerformance from "./performance/LeaguePerformance";
import TournamentPerformance from "./performance/TournamentPerformance";

const { width: screenWidth } = Dimensions.get("window");

const PERFORMANCE_SUB_TABS = [
  { key: "player", label: "Player" },
  { key: "team", label: "Team" },
  { key: "league", label: "League" },
  { key: "tournament", label: "Tournament" },
] as const;

type PerformanceSubTab = (typeof PERFORMANCE_SUB_TABS)[number]["key"];

interface ClubPerformanceProps {
  clubId: string;
  initialSubTab?: PerformanceSubTab;
}

const ClubPerformance: React.FC<ClubPerformanceProps> = ({
  clubId,
  initialSubTab = "player",
}) => {
  const [activeTab, setActiveTab] = useState<PerformanceSubTab>(initialSubTab);

  const renderContent = () => {
    switch (activeTab) {
      case "player":
        return <PlayerPerformance clubId={clubId} />;
      case "team":
        return <TeamPerformance clubId={clubId} />;
      case "league":
        return <LeaguePerformance clubId={clubId} />;
      case "tournament":
        return <TournamentPerformance clubId={clubId} />;
      default:
        return null;
    }
  };

  return (
    <>
      <TabRow>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4 }}
        >
          {PERFORMANCE_SUB_TABS.map((t) => (
            <SubTabItem
              key={t.key}
              isActive={activeTab === t.key}
              onPress={() => setActiveTab(t.key)}
            >
              <SubTabText isActive={activeTab === t.key}>
                {t.label}
              </SubTabText>
            </SubTabItem>
          ))}
        </ScrollView>
      </TabRow>
      {renderContent()}
    </>
  );
};

const TabRow = styled.View({
  flexDirection: "row",
  marginBottom: 16,
  paddingTop: 4,
});

const SubTabItem = styled.TouchableOpacity<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    flex: 1,
    minWidth: (screenWidth - 32) / 4,
    borderBottomColor: isActive ? "#00A2FF" : "rgb(9, 33, 62)",
    borderBottomWidth: 2,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  }),
);

const SubTabText = styled.Text<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    fontSize: 13,
    fontWeight: "bold",
    color: isActive ? "#fff" : "#aaa",
    textAlign: "center",
  }),
);

export default ClubPerformance;
