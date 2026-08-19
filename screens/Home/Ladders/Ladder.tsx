import React, { useCallback, useContext, useState } from "react";
import { Dimensions, ScrollView } from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";
import styled from "styled-components/native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { LADDER_TYPE } from "@shared/types";

import Tag from "../../../components/Tag";
import LadderSummary from "../../../components/Summary/LadderSummary";
import LoadingOverlay from "../../../components/LoadingOverlay";
import { LadderContext } from "../../../context/LadderContext";
import { ccDefaultImage } from "../../../mockImages/index";
import Matchmaking from "./tabs/Matchmaking";

type LadderTab = "Summary" | "Matchmaking" | "Performance" | "Playoff Bracket";

type LadderRouteParams = { ladderId: string; tab?: LadderTab };

const Ladder: React.FC = () => {
  const route =
    useRoute<RouteProp<Record<string, LadderRouteParams>, string>>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { ladderId, tab } = route.params;
  const { fetchLadderById, ladderById } = useContext(LadderContext);

  const [ladderLoading, setLadderLoading] = useState(true);
  const [ladderNotFound, setLadderNotFound] = useState(false);
  const [selectedTab, setSelectedTab] = useState<LadderTab>(tab || "Summary");
  const [menuOpen, setMenuOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        if (!ladderId) return;
        setLadderLoading(true);
        try {
          const fetched = await fetchLadderById(ladderId);
          setLadderNotFound(!fetched);
        } catch (error) {
          console.error("Error fetching ladder data:", error);
          setLadderNotFound(true);
        } finally {
          setLadderLoading(false);
        }
      };
      fetchData();
    }, [ladderId, fetchLadderById]),
  );

  const performanceLabel: LadderTab = "Performance";
  const performanceDisplay =
    ladderById?.ladderType === LADDER_TYPE.DOUBLES
      ? "Team Performance"
      : "Player Performance";

  const tabs: { key: LadderTab; label: string }[] = [
    { key: "Summary", label: "Summary" },
    { key: "Matchmaking", label: "Matchmaking" },
    { key: performanceLabel, label: performanceDisplay },
    { key: "Playoff Bracket", label: "Playoff Bracket" },
  ];

  const renderTab = () => {
    if (!ladderById) return null;
    switch (selectedTab) {
      case "Summary":
        return <LadderSummary ladder={ladderById} />;
      case "Matchmaking":
        return <Matchmaking ladder={ladderById} />;
      case "Performance":
      case "Playoff Bracket":
        return (
          <ComingSoon testID="ladder-coming-soon">
            <ComingSoonText>Coming soon</ComingSoonText>
          </ComingSoon>
        );
      default:
        return null;
    }
  };

  if (!ladderLoading && (ladderNotFound || !ladderById)) {
    return (
      <NotFound>
        <NotFoundText>Ladder not found.</NotFoundText>
      </NotFound>
    );
  }

  // const status = ladderById ? STATUS_LABELS[ladderById.status] : undefined;

  return (
    <Screen>
      <LoadingOverlay visible={ladderLoading} loadingText="Ladder" />

      {!ladderLoading && ladderById && (
        <>
          <Overview>
            <LadderImage
              source={
                ladderById.image ? { uri: ladderById.image } : ccDefaultImage
              }
            >
              <OverlayTop>
                <IconButton
                  activeOpacity={0.8}
                  onPress={() => setMenuOpen((open) => !open)}
                  testID="ladder-burger"
                >
                  <Ionicons name="menu" size={24} color="#ffffff" />
                </IconButton>
              </OverlayTop>

              {menuOpen && (
                <Menu testID="ladder-menu">
                  <MenuItem
                    activeOpacity={0.7}
                    onPress={() => {
                      setMenuOpen(false);
                      navigation.navigate("LadderRules", { ladderId });
                    }}
                    testID="ladder-menu-rules"
                  >
                    <Ionicons name="book-outline" size={16} color="#ffffff" />
                    <MenuItemText>Rules</MenuItemText>
                  </MenuItem>
                  <MenuItem
                    activeOpacity={0.7}
                    onPress={() => {
                      setMenuOpen(false);
                      navigation.navigate("LadderTerms", { ladderId });
                    }}
                    testID="ladder-menu-terms"
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={16}
                      color="#ffffff"
                    />
                    <MenuItemText>Terms &amp; Conditions</MenuItemText>
                  </MenuItem>
                </Menu>
              )}

              <OverlayBottom>
                <Tag
                  name="How to Play"
                  color="#00A2FF"
                  iconColor="white"
                  iconSize={15}
                  icon="book-outline"
                  iconPosition="right"
                  onPress={() =>
                    navigation.navigate("LadderHowToPlay", {
                      ladderId,
                      maxPlayers: ladderById.maxPlayers,
                    })
                  }
                  bold
                />
              </OverlayBottom>
            </LadderImage>
          </Overview>

          <TabsContainer>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 10 }}
            >
              {tabs.map((t) => (
                <TabButton
                  key={t.key}
                  isSelected={selectedTab === t.key}
                  onPress={() => setSelectedTab(t.key)}
                  testID={`ladder-tab-${t.key}`}
                >
                  <TabText>{t.label}</TabText>
                </TabButton>
              ))}
            </ScrollView>
          </TabsContainer>

          {renderTab()}
        </>
      )}
    </Screen>
  );
};

export default Ladder;

const { width: screenWidth } = Dimensions.get("window");

const Screen = styled.View({
  flex: 1,
  backgroundColor: "#00152B",
});

const NotFound = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgb(3, 16, 31)",
});

const NotFoundText = styled.Text({
  color: "#aaa",
  textAlign: "center",
});

const Overview = styled.View({
  height: 200,
  width: "100%",
  position: "relative",
});

const LadderImage = styled.ImageBackground.attrs({
  imageStyle: { resizeMode: "cover" },
})({
  width: "100%",
  height: "100%",
  justifyContent: "flex-end",
});

const OverlayTop = styled.View({
  position: "absolute",
  top: 15,
  right: 15,
  zIndex: 5,
});

const IconButton = styled.TouchableOpacity({
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: "center",
  justifyContent: "center",
});

const Menu = styled.View({
  position: "absolute",
  top: 60,
  right: 15,
  zIndex: 10,
  minWidth: 150,
  borderRadius: 10,
  paddingVertical: 6,
  backgroundColor: "#0A1F33",
  borderWidth: 1,
  borderColor: "#192336",
});

const MenuItem = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  paddingHorizontal: 14,
  paddingVertical: 10,
});

const MenuItemText = styled.Text({
  color: "#ffffff",
  fontSize: 14,
});

const OverlayBottom = styled.View({
  flexDirection: "row",
  justifyContent: "flex-end",
  padding: 15,
  marginBottom: 20,
});

const TabsContainer = styled.View({
  width: "100%",
  backgroundColor: "#00152B",
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
  paddingTop: 25,
  paddingBottom: 10,
  marginTop: -20,
});

const TabButton = styled.TouchableOpacity<{ isSelected: boolean }>(
  ({ isSelected }: { isSelected: boolean }) => ({
    marginHorizontal: 5,
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

const ComingSoon = styled.View({
  padding: 40,
  alignItems: "center",
  justifyContent: "center",
});

const ComingSoonText = styled.Text({
  color: "#9fb8c8",
  fontSize: 15,
});
