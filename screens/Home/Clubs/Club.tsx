import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { collection, getDocs } from "firebase/firestore";

import Tag from "../../../components/Tag";
import { LeagueContext } from "../../../context/LeagueContext";
import { UserContext } from "../../../context/UserContext";
import { ccDefaultImage } from "../../../mockImages/index";
import LoadingOverlay from "../../../components/LoadingOverlay";
import { COLLECTION_NAMES } from "@shared";
import { db } from "../../../services/firebase.config";
import type { Club } from "@shared/types";

const { width: screenWidth } = Dimensions.get("window");

const PRIMARY_TABS = [
  "Summary",
  "Teams",
  "Stats",
  "Club Performance",
] as const;

type PrimaryTab = (typeof PRIMARY_TABS)[number];

const PERFORMANCE_SUB_TABS = [
  { key: "league_wins", label: "League Wins" },
  { key: "tournament_wins", label: "Tournament Wins" },
  { key: "player_performance", label: "Player Performance" },
] as const;

type PerformanceSubTab = (typeof PERFORMANCE_SUB_TABS)[number]["key"];

type ClubRouteParams = {
  Club: {
    clubId: string;
    primaryTab?: PrimaryTab;
    performanceTab?: PerformanceSubTab;
  };
};

const openMapsQuery = (query: string) => {
  const encoded = encodeURIComponent(query);
  const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  Linking.openURL(url).catch((err) =>
    console.error("Error opening Google Maps:", err),
  );
};

const ClubScreen: React.FC = () => {
  const route = useRoute<RouteProp<ClubRouteParams, "Club">>();
  const navigation = useNavigation();
  const { clubId, primaryTab, performanceTab } = route.params ?? {};

  const { fetchClubById, clubById } = useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);

  const [loading, setLoading] = useState(true);
  const [clubNotFound, setClubNotFound] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [selectedTab, setSelectedTab] = useState<PrimaryTab>(
    primaryTab ?? "Summary",
  );
  const [performanceSubTab, setPerformanceSubTab] =
    useState<PerformanceSubTab>(performanceTab ?? "league_wins");

  const isOwner = currentUser?.userId === clubById?.clubOwner?.userId;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = async () => {
        if (!clubId) {
          setLoading(false);
          setClubNotFound(true);
          return;
        }
        setLoading(true);
        try {
          const fetched = await fetchClubById(clubId);
          if (cancelled) return;
          if (!fetched) {
            setClubNotFound(true);
            setMemberCount(0);
          } else {
            setClubNotFound(false);
            const snap = await getDocs(
              collection(db, COLLECTION_NAMES.clubs, clubId, "participants"),
            );
            if (!cancelled) setMemberCount(snap.size);
          }
        } catch (e) {
          console.error("Club load error:", e);
          if (!cancelled) setClubNotFound(true);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };

      load();
      return () => {
        cancelled = true;
      };
    }, [clubId, fetchClubById]),
  );

  useEffect(() => {
    if (primaryTab) setSelectedTab(primaryTab);
  }, [primaryTab]);

  useEffect(() => {
    if (performanceTab) setPerformanceSubTab(performanceTab);
  }, [performanceTab]);

  const handleTabPress = (tab: PrimaryTab) => {
    setSelectedTab(tab);
  };

  const renderPlaceholder = (message: string) => (
    <PlaceholderWrap>
      <PlaceholderText>{message}</PlaceholderText>
    </PlaceholderWrap>
  );

  const renderPerformanceContent = () => {
    switch (performanceSubTab) {
      case "league_wins":
        return renderPlaceholder(
          "League wins across your club will appear here.",
        );
      case "tournament_wins":
        return renderPlaceholder(
          "Tournament wins across your club will appear here.",
        );
      case "player_performance":
        return renderPlaceholder(
          "Aggregated player performance for the club will appear here.",
        );
      default:
        return null;
    }
  };

  const renderPrimaryContent = () => {
    switch (selectedTab) {
      case "Summary":
        return renderPlaceholder(
          "Club summary and activity will appear here.",
        );
      case "Teams":
        return renderPlaceholder("Club teams will appear here.");
      case "Stats":
        return renderPlaceholder("Club statistics will appear here.");
      case "Club Performance":
        return (
          <>
            <PerformanceTabRow>
              {PERFORMANCE_SUB_TABS.map((t) => (
                <PerformanceTabItem
                  key={t.key}
                  isActive={performanceSubTab === t.key}
                  onPress={() => setPerformanceSubTab(t.key)}
                >
                  <PerformanceTabText isActive={performanceSubTab === t.key}>
                    {t.label}
                  </PerformanceTabText>
                </PerformanceTabItem>
              ))}
            </PerformanceTabRow>
            {renderPerformanceContent()}
          </>
        );
      default:
        return null;
    }
  };

  if (!clubId) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgb(3, 16, 31)",
        }}
      >
        <Text style={{ color: "#aaa", textAlign: "center" }}>
          Club not found.
        </Text>
      </View>
    );
  }

  if (!loading && clubNotFound) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgb(3, 16, 31)",
        }}
      >
        <Text style={{ color: "#aaa", textAlign: "center" }}>
          Club not found.
        </Text>
      </View>
    );
  }

  const club = clubById as Club | null;
  const imageUri = club?.clubImage || undefined;

  return (
    <View style={{ flex: 1, backgroundColor: "#00152B" }}>
      <LoadingOverlay visible={loading} loadingText="Club" />

      {!loading && clubById && club && (
        <>
          <Overview>
            <ClubHeaderImage
              source={imageUri ? { uri: imageUri } : ccDefaultImage}
            >
              <GradientOverlay
                colors={["rgba(0, 0, 0, 0.1)", "rgba(0, 0, 0, 0.7)"]}
                locations={[0.1, 1]}
              />

              <ClubDetailsContainer>
                <BackRow>
                  <BackButton
                    onPress={() =>
                      navigation.canGoBack()
                        ? navigation.goBack()
                        : navigation.navigate("HomeMain" as never)
                    }
                  >
                    <Ionicons name="chevron-back" size={26} color="white" />
                  </BackButton>
                  {isOwner ? (
                    <OwnerBadge>
                      <Tag
                        name="Owner"
                        color="#16181B"
                        iconColor="#00A2FF"
                        iconSize={14}
                        icon="checkmark-circle-outline"
                        iconPosition="right"
                        bold
                      />
                    </OwnerBadge>
                  ) : (
                    <View style={{ width: 40 }} />
                  )}
                </BackRow>

                <TitleBlock>
                  <ClubNameText>{club.clubName}</ClubNameText>
                </TitleBlock>

                {club.clubLocation ? (
                  <AddressRow
                    onPress={() => openMapsQuery(club.clubLocation)}
                  >
                    <Ionicons name="location-outline" size={18} color="#fff" />
                    <ClubLocationText>{club.clubLocation}</ClubLocationText>
                    <Ionicons name="open-outline" size={18} color="#00A2FF" />
                  </AddressRow>
                ) : null}

                <TagRow>
                  <Tag
                    name={`${memberCount}`}
                    color={"rgba(0, 0, 0, 0.7)"}
                    iconColor={"#00A2FF"}
                    iconSize={15}
                    icon={"person"}
                    iconPosition={"right"}
                    bold
                  />
                  <Tag name="Club" color="#FAB234" />
                </TagRow>
              </ClubDetailsContainer>
            </ClubHeaderImage>
          </Overview>

          <TabsContainer>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 10 }}
            >
              {PRIMARY_TABS.map((tab) => (
                <PrimaryTab
                  key={tab}
                  onPress={() => handleTabPress(tab)}
                  isSelected={selectedTab === tab}
                >
                  <PrimaryTabText isSelected={selectedTab === tab}>
                    {tab}
                  </PrimaryTabText>
                </PrimaryTab>
              ))}
            </ScrollView>
          </TabsContainer>

          <ContentArea>{renderPrimaryContent()}</ContentArea>
        </>
      )}
    </View>
  );
};

const Overview = styled.View({
  flexDirection: "row",
  height: 200,
  width: "100%",
  justifyContent: "center",
  alignItems: "flex-start",
  position: "relative",
});

const ClubHeaderImage = styled.ImageBackground.attrs({
  imageStyle: {
    resizeMode: "cover",
  },
})({
  width: "100%",
  height: "100%",
  justifyContent: "flex-end",
  alignItems: "center",
});

const GradientOverlay = styled(LinearGradient)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: -60,
});

const ClubDetailsContainer = styled.View({
  width: "100%",
  height: "100%",
  paddingLeft: 15,
  paddingRight: 15,
  justifyContent: "center",
});

const BackRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
});

const BackButton = styled.TouchableOpacity({
  padding: 4,
});

const OwnerBadge = styled.View({
  alignItems: "flex-end",
});

const TitleBlock = styled.View({
  paddingVertical: 6,
  paddingHorizontal: 8,
  backgroundColor: "rgba(0, 0, 0, 0.35)",
  borderRadius: 8,
  alignSelf: "flex-start",
  marginBottom: 10,
});

const ClubNameText = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
});

const AddressRow = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  marginBottom: 12,
  paddingVertical: 6,
  paddingHorizontal: 8,
  backgroundColor: "rgba(0, 0, 0, 0.35)",
  borderRadius: 8,
  alignSelf: "flex-start",
  maxWidth: "100%",
});

const ClubLocationText = styled.Text({
  flexShrink: 1,
  fontSize: 13,
  color: "white",
});

const TagRow = styled.View({
  flexDirection: "row",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
});

const TabsContainer = styled.View({
  width: "100%",
  backgroundColor: "#00152B",
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
  paddingTop: 20,
  paddingBottom: 12,
});

const PrimaryTab = styled.TouchableOpacity<{ isSelected: boolean }>(
  ({ isSelected }: { isSelected: boolean }) => ({
    marginHorizontal: 5,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: isSelected ? "#00A2FF" : "rgba(255,255,255,0.08)",
    borderWidth: isSelected ? 0 : 1,
    borderColor: "rgba(255,255,255,0.22)",
  }),
);

const PrimaryTabText = styled.Text<{ isSelected: boolean }>(
  ({ isSelected }: { isSelected: boolean }) => ({
    color: "#fff",
    fontWeight: isSelected ? "700" : "500",
    fontSize: screenWidth <= 400 ? 12 : 13,
  }),
);

/** Second-layer tabs — same interaction pattern as Profile Activity (underline). */
const PerformanceTabRow = styled.View({
  flexDirection: "row",
  marginBottom: 16,
  paddingTop: 4,
});

const PerformanceTabItem = styled.TouchableOpacity<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    flex: 1,
    borderBottomColor: isActive ? "#00A2FF" : "rgb(9, 33, 62)",
    borderBottomWidth: 2,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  }),
);

const PerformanceTabText = styled.Text<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    fontSize: 13,
    fontWeight: "bold",
    color: isActive ? "#fff" : "#aaa",
    textAlign: "center",
  }),
);

const ContentArea = styled.View({
  flex: 1,
  paddingHorizontal: 16,
  paddingTop: 12,
});

const PlaceholderWrap = styled.View({
  flex: 1,
  paddingVertical: 24,
  justifyContent: "flex-start",
});

const PlaceholderText = styled.Text({
  color: "#888",
  fontStyle: "italic",
  fontSize: 15,
  lineHeight: 22,
});

export default ClubScreen;
