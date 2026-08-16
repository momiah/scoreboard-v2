import React, { useCallback, useContext, useState } from "react";
import { Dimensions, ScrollView, Text, View } from "react-native";
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
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";

import { LADDER_TYPE } from "@shared/types";
// import type { Ladder as LadderType } from "@shared/types";

// import Tag from "../../../components/Tag";
import LadderSummary from "../../../components/Summary/LadderSummary";
import JoinLadderModal from "../../../components/Modals/JoinLadderModal";
import LoadingOverlay from "../../../components/LoadingOverlay";
import { LadderContext } from "../../../context/LadderContext";
import { ccDefaultImage } from "../../../mockImages/index";

type LadderTab = "Summary" | "Matchmaking" | "Performance" | "Playoff Bracket";

type LadderRouteParams = { ladderId: string; tab?: LadderTab };

// const STATUS_LABELS: Record<string, { label: string; color: string }> = {
//   registrationOpen: { label: "Registration Open", color: "#FAB234" },
//   registrationClosed: { label: "Registration Closed", color: "#FF9800" },
//   playoffs: { label: "Playoffs", color: "#286EFA" },
//   completed: { label: "Completed", color: "#1A6B1A" },
//   cancelled: { label: "Cancelled", color: "#FF4757" },
// };

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
  const [joinModalVisible, setJoinModalVisible] = useState(false);

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
              <GradientOverlay
                colors={["rgba(0, 0, 0, 0.1)", "rgba(0, 0, 0, 0.7)"]}
                locations={[0.1, 1]}
              />

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
                </Menu>
              )}

              <OverlayBottom>
                <JoinButton
                  activeOpacity={0.85}
                  onPress={() => setJoinModalVisible(true)}
                  testID="ladder-overview-join"
                >
                  <JoinButtonText>Join Ladder</JoinButtonText>
                </JoinButton>
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

          {joinModalVisible && (
            <JoinLadderModal
              modalVisible={joinModalVisible}
              setModalVisible={setJoinModalVisible}
              ladder={ladderById}
            />
          )}
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

const GradientOverlay = styled(LinearGradient)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
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
  backgroundColor: "rgba(0, 0, 0, 0.4)",
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
});

const JoinButton = styled.TouchableOpacity({
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 20,
  backgroundColor: "#00A2FF",
});

const JoinButtonText = styled.Text({
  color: "#ffffff",
  fontSize: 14,
  fontWeight: "bold",
});

const DetailsContainer = styled.View({
  paddingHorizontal: 15,
  paddingBottom: 15,
  gap: 8,
});

const NameBadge = styled.View({
  padding: 5,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderRadius: 5,
  alignSelf: "flex-start",
});

const LadderName = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
});

const TagRow = styled.View({
  flexDirection: "row",
  gap: 5,
  flexWrap: "wrap",
});

const RegionText = styled.Text({
  color: "white",
  fontSize: 13,
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
  ({ isSelected }) => ({
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
