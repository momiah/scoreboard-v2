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

import ClubFeed from "./tabs/ClubFeed";
import ClubPerformance from "./tabs/ClubPerformance";
import ClubLeagues from "./tabs/ClubLeagues";
import ClubTournaments from "./tabs/ClubTournaments";
import InviteClubMembersModal from "../../../components/Modals/InviteClubMembersModal";

const { width: screenWidth } = Dimensions.get("window");

const PRIMARY_TABS = [
  "Feed",
  "Club Performance",
  "Leagues",
  "Tournaments",
] as const;

type PrimaryTab = (typeof PRIMARY_TABS)[number];

type PerformanceSubTab = "player" | "team" | "league" | "tournament";

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
    primaryTab ?? "Feed",
  );
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

  const isOwner = currentUser?.userId === clubById?.clubOwner?.userId;
  const isAdmin = clubById?.clubAdmins?.some(
    (a) => a.userId === currentUser?.userId,
  );
  const canInvite = isOwner || isAdmin;

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

  const renderPrimaryContent = () => {
    switch (selectedTab) {
      case "Feed":
        return <ClubFeed />;
      case "Club Performance":
        return (
          <ClubPerformance clubId={clubId} initialSubTab={performanceTab} />
        );
      case "Leagues":
        return <ClubLeagues clubId={clubId} />;
      case "Tournaments":
        return <ClubTournaments clubId={clubId} />;
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

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flexDirection: "row", gap: 5 }}>
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
                  </View>
                  {canInvite && (
                    <Tag
                      name="Invite Members"
                      color="#00A2FF"
                      icon="paper-plane-sharp"
                      onPress={() => setInviteModalVisible(true)}
                      bold
                    />
                  )}
                </View>
              </ClubDetailsContainer>
            </ClubHeaderImage>
          </Overview>

          <TabsContainer>
            <GradientOverlay
              colors={["rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.4)"]}
              locations={[0.1, 1]}
              style={{ bottom: -560 }}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 10 }}
            >
              {PRIMARY_TABS.map((tab) => (
                <PrimaryTabButton
                  key={tab}
                  onPress={() => setSelectedTab(tab)}
                  isSelected={selectedTab === tab}
                >
                  <PrimaryTabButtonText isSelected={selectedTab === tab}>
                    {tab}
                  </PrimaryTabButtonText>
                </PrimaryTabButton>
              ))}
            </ScrollView>
          </TabsContainer>

          <ContentArea>{renderPrimaryContent()}</ContentArea>

          {club && (
            <InviteClubMembersModal
              visible={inviteModalVisible}
              onClose={() => setInviteModalVisible(false)}
              club={club}
            />
          )}
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

const TabsContainer = styled.View({
  width: "100%",
  backgroundColor: "#00152B",
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
  paddingTop: 25,
  paddingBottom: 10,
});

const PrimaryTabButton = styled.TouchableOpacity<{ isSelected: boolean }>(
  ({ isSelected }: { isSelected: boolean }) => ({
    marginHorizontal: 5,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: isSelected ? 2 : 1,
    borderColor: isSelected ? "#00A2FF" : "white",
  }),
);

const PrimaryTabButtonText = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 12 : 14,
});

const ContentArea = styled.View({
  flex: 1,
  paddingHorizontal: 16,
  paddingTop: 12,
});

export default ClubScreen;
