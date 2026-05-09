import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  Image,
  FlatList,
} from "react-native";
import { UserContext } from "../../context/UserContext";
import styled from "styled-components/native";
import CourtChampsLogo from "../../assets/court-champ-logo-icon.png";
import { useRoute, useNavigation } from "@react-navigation/native";
import { GameContext } from "../../context/GameContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MedalDisplay from "../../components/performance/MedalDisplay";
import Ionicons from "@expo/vector-icons/Ionicons";
import ProfileActivity from "../../components/Profiles/ProfileActivity";
import ProfilePerformance from "../../components/Profiles/ProfilePerformance";
import RankSuffix from "../../components/RankSuffix";
import { formatNumber } from "../../helpers/formatNumber";
import Icon from "react-native-ico-flags";
import { RankInformation } from "../../components/Modals/RankInformation";
import LoadingOverlay from "../../components/LoadingOverlay";
import ProfileVideos from "../../components/Profiles/ProfileVideos";

const { width: screenWidth } = Dimensions.get("window");
const screenAdjustedMedalSize = screenWidth <= 400 ? 70 : 80;
// Breakpoint aligned with zinx/social-auth-google-and-fb-android (slightly wider “small” width).
const screenAdjustedStatFontSize = screenWidth <= 430 ? 15 : 18;
const AVATAR_SIZE = screenWidth <= 400 ? 70 : 80;

// Toolbar top: ticket was iOS-only (“too much top padding”); SafeAreaView already insets on iOS.
// Android keeps marginTop 50 from profile/tabs styling branch (see a7e0141 / d6fdc6).
const PROFILE_TOOLBAR_MARGIN_TOP = Platform.OS === "ios" ? 8 : 50;
// Overview top padding: trim on iOS only; Android unchanged at 20.
const OVERVIEW_PADDING_TOP = Platform.OS === "ios" ? 12 : 20;
const OVERVIEW_PADDING_HORIZONTAL = 20;
const OVERVIEW_PADDING_BOTTOM = 20;
// When viewing another user’s profile there is no refresh/toolbar row; extra offset on Android only.
const OVERVIEW_MARGIN_TOP_WHEN_VIEWING_OTHER = Platform.OS === "ios" ? 0 : 30;

const UserProfile = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {
    getUserById,
    getGlobalRank,
    currentUser,
    profileViewCount,
    getCountryRank,
  } = useContext(UserContext);
  const { medalNames, findRankIndex } = useContext(GameContext);
  const [ranksVisible, setRanksVisible] = useState(false);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("Performance");
  const [globalRank, setGlobalRank] = useState(null);
  const [countryRank, setCountryRank] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const loadProfile = async () => {
    try {
      setRefreshing(true);
      if (route.params?.userId) {
        const userProfile = await getUserById(route.params.userId);
        setProfile(userProfile);
      } else if (currentUser) {
        const personalProfile = await getUserById(currentUser?.userId);
        setProfile(personalProfile);
      } else {
        const userId = await AsyncStorage.getItem("userId");
        if (userId) {
          const personalProfile = await getUserById(userId);
          setProfile(personalProfile);
        } else {
          setProfile(null);
        }
      }
    } catch (error) {
      console.error("Profile load error:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [route.params?.userId, currentUser]);

  useEffect(() => {
    if (
      profile &&
      !loading &&
      route.params?.userId &&
      route.params.userId !== currentUser?.userId
    ) {
      profileViewCount(route.params.userId).catch((err) =>
        console.error("Profile view tracking failed:", err),
      );
    }
  }, [profile, loading]);

  useEffect(() => {
    const fetchRank = async () => {
      if (profile) {
        try {
          const rank = await getGlobalRank(profile.userId);
          const countryRank = await getCountryRank(
            profile.userId,
            profile.location?.countryCode,
          );
          setCountryRank(countryRank);
          setGlobalRank(rank);
        } catch (error) {
          console.error("Error fetching global rank:", error);
        }
      }
    };
    fetchRank();
  }, [profile, getGlobalRank]);

  useEffect(() => {
    if (!route.params?.userId && !profile && !loading && !currentUser) {
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    }
  }, [profile, loading]);

  const profileDetail = profile?.profileDetail;

  const tabs = useMemo(
    () => [
      { component: "Profile" },
      { component: "Performance" },
      { component: "Activity" },
      { component: "Videos" },
    ],
    [],
  );

  const sections = useMemo(
    () => [
      {
        title: "Name",
        getValue: () => `${profile?.firstName} ${profile?.lastName}`.trim(),
        fallback: "",
      },
      {
        title: "Location",
        getValue: () => {
          const loc = profile?.location;
          if (!loc) return ""; // will fall back below
          const { city, country } = loc;
          if (city && country) return `${city}, ${country}`;
          return city || country || "";
        },
        fallback: "Location not provided",
      },

      {
        title: "Hand Preference",
        key: "handPreference",
        fallback: "Not provided",
      },
      { title: "Bio", key: "bio", fallback: "Bio not provided" },
      {
        title: "Contact",
        getValue: () => {
          // Always show email for own profile, otherwise check showEmail setting
          if (isOwnProfile || profile?.showEmail) {
            return profile?.email || "Email not provided";
          }
          return "Email is private";
        },
        fallback: "Email is private",
      },
      {
        title: "Member Since",
        getValue: () => profileDetail?.memberSince,
        fallback: "Date not available",
      },
      {
        title: "Last Active",
        getValue: () => profileDetail?.lastActive,
        fallback: "Date not available",
      },
    ],
    [profile, profileDetail],
  );

  const renderProfileContent = useCallback(
    () => (
      <View style={{ gap: 5, paddingTop: 10 }}>
        {sections.map((section, index) => {
          const content = section.getValue
            ? section.getValue() || section.fallback
            : profile?.[section.key] || section.fallback;

          return (
            <React.Fragment key={section.title}>
              <SectionTitle>{section.title}</SectionTitle>
              <SectionContent>{content}</SectionContent>
              {index !== sections.length - 1 && <Divider />}
            </React.Fragment>
          );
        })}
      </View>
    ),
    [sections, profile],
  );

  const renderComponent = useCallback(() => {
    switch (selectedTab) {
      case "Profile":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            {renderProfileContent()}
          </ScrollView>
        );
      case "Performance":
        return <ProfilePerformance profile={profile} globalRank={globalRank} />;
      case "Activity":
        return <ProfileActivity profile={profile} />;
      case "Videos":
        return profile ? (
          <ProfileVideos
            userId={profile.userId}
            isOwnProfile={isOwnProfile}
            firstName={profile.firstName}
          />
        ) : null;
      default:
        return null;
    }
  }, [selectedTab, renderProfileContent]);

  const isOwnProfile =
    !route.params?.userId || route.params?.userId === currentUser?.userId;

  const rawXP = profileDetail?.XP; // Keep as number
  const profileXp = formatNumber(rawXP?.toFixed(0) || 1); // For display only
  const rankLevel = findRankIndex(rawXP) + 1; // Pass raw number to function

  const pointDifference = profileDetail?.totalPointDifference || 0;
  const pointDifferenceMetric = pointDifference > 0 ? "+" : "";

  return (
    <Container>
      <LoadingOverlay visible={loading} loadingText="Profile" />

      {!loading && !profile && (
        <LoadingContainer>
          <Text style={{ color: "#aaa" }}>This profile no longer exists</Text>
        </LoadingContainer>
      )}

      {!loading && profile && profileDetail && (
        <>
          {isOwnProfile && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: PROFILE_TOOLBAR_MARGIN_TOP,
              }}
            >
              <TouchableOpacity
                style={{ alignSelf: "flex-start", paddingHorizontal: 20 }}
                onPress={() => loadProfile()}
                disabled={refreshing}
              >
                {refreshing ? (
                  <ActivityIndicator color="#aaa" size="small" />
                ) : (
                  <Ionicons
                    name="refresh-circle-outline"
                    size={30}
                    color="#aaa"
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={{ alignSelf: "flex-end", paddingHorizontal: 20 }}
                onPress={() => navigation.navigate("ProfileMenu")}
              >
                <Ionicons name="menu" size={30} color="#aaa" />
              </TouchableOpacity>
            </View>
          )}

          <Overview $isOwnProfile={isOwnProfile}>
            {profile?.headline ? (
              <View style={{ flex: 1 }}>
                <PlayerDetail>
                  <Pressable onLongPress={() => setPreviewVisible(true)}>
                    <Avatar
                      source={
                        profile?.profileImage
                          ? { uri: profile.profileImage }
                          : CourtChampsLogo
                      }
                    />
                  </Pressable>
                  <DetailColumn>
                    <PlayerName>{profile?.username}</PlayerName>
                    <DetailText>{profileXp ?? 0} CP</DetailText>
                    <DetailText
                      style={{
                        fontWeight: "bold",
                        color: pointDifference < 0 ? "red" : "green",
                      }}
                    >
                      {pointDifferenceMetric}
                      {formatNumber(pointDifference)} PD
                    </DetailText>
                  </DetailColumn>
                </PlayerDetail>
                <Headline>
                  <Text style={{ color: "#fff", fontSize: 14 }}>
                    {profile.headline}
                  </Text>
                </Headline>
              </View>
            ) : (
              <PlayerDetail>
                <Pressable onLongPress={() => setPreviewVisible(true)}>
                  <Avatar
                    source={
                      profile?.profileImage
                        ? { uri: profile.profileImage }
                        : CourtChampsLogo
                    }
                  />
                </Pressable>
                <DetailColumn>
                  <PlayerName>{profile?.username}</PlayerName>
                  <DetailText>{profileXp ?? 0} CP</DetailText>
                  <DetailText
                    style={{
                      fontWeight: "bold",
                      color: pointDifference < 0 ? "red" : "green",
                    }}
                  >
                    {pointDifferenceMetric}
                    {formatNumber(pointDifference)} PD
                  </DetailText>
                </DetailColumn>
              </PlayerDetail>
            )}
            <MedalContainer>
              <TouchableOpacity onPress={() => setRanksVisible(true)}>
                <MedalDisplay
                  xp={profileDetail?.XP}
                  size={screenAdjustedMedalSize}
                />
              </TouchableOpacity>
              <MedalName>{medalNames(profileDetail?.XP)}</MedalName>
              <MedalName
                style={{
                  // fontWeight: "bold",
                  fontStyle: "italic",
                  color: "#cdcdcdff",
                }}
              >
                ( Level {rankLevel} )
              </MedalName>
            </MedalContainer>
          </Overview>

          <ProfileSummary>
            <CCRankContainer>
              <Ionicons name="globe-outline" size={20} color="#aaa" />
              <RankSuffix
                number={globalRank}
                numberStyle={{
                  fontSize: screenAdjustedStatFontSize,
                  color: "white",
                }}
                suffixStyle={{ color: "rgba(255,255,255,0.7)" }}
              />
            </CCRankContainer>
            <CCRankContainer>
              <Icon
                name={profile?.location.countryCode}
                height="20"
                width="20"
              />
              <RankSuffix
                number={countryRank}
                numberStyle={{
                  fontSize: screenAdjustedStatFontSize,
                  color: "white",
                }}
                suffixStyle={{ color: "rgba(255,255,255,0.7)" }}
              />
            </CCRankContainer>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <DetailText>
                {formatNumber(profile?.profileViews ?? 0)}
              </DetailText>
              <Ionicons name="eye" size={20} color="#aaa" />
            </View>
          </ProfileSummary>

          <View style={{ alignSelf: "stretch" }}>
            <FlatList
              data={tabs}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.component}
              contentContainerStyle={{
                paddingHorizontal: 10,
                paddingVertical: 10,
              }}
              renderItem={({ item: tab }) => (
                <Tab
                  onPress={() => setSelectedTab(tab.component)}
                  isSelected={selectedTab === tab.component}
                >
                  <TabText>{tab.component}</TabText>
                </Tab>
              )}
            />
          </View>

          <ProfileContent
            style={selectedTab === "Videos" ? { paddingHorizontal: 0 } : {}}
          >
            {renderComponent()}
          </ProfileContent>

          <Modal visible={previewVisible} transparent animationType="fade">
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setPreviewVisible(false)}
            >
              <Image
                source={
                  profile?.profileImage
                    ? { uri: profile?.profileImage }
                    : CourtChampsLogo
                }
                style={styles.fullImage}
                resizeMode="contain"
              />
            </Pressable>
          </Modal>

          {ranksVisible && (
            <RankInformation
              visible={ranksVisible}
              onClose={() => setRanksVisible(false)}
            />
          )}
        </>
      )}
    </Container>
  );
};

// Styled components
const Container = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
});

const LoadingContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgb(3, 16, 31)",
});

const Overview = styled.View(({ $isOwnProfile }) => ({
  marginTop:
    $isOwnProfile === false
      ? OVERVIEW_MARGIN_TOP_WHEN_VIEWING_OTHER
      : undefined,
  paddingTop: OVERVIEW_PADDING_TOP,
  paddingRight: OVERVIEW_PADDING_HORIZONTAL,
  paddingBottom: OVERVIEW_PADDING_BOTTOM,
  paddingLeft: OVERVIEW_PADDING_HORIZONTAL,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}));

const PlayerDetail = styled.View({
  flexDirection: "row",
  gap: 20,
  flex: 1,
});

const DetailColumn = styled.View({
  flex: 1,
  gap: 2,
});

const Avatar = styled.Image({
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  borderRadius: AVATAR_SIZE / 2,
  borderWidth: 2,
  borderColor: "#00a2ff",
});

const PlayerName = styled.Text({
  fontSize: 25,
  color: "white",
  fontWeight: "bold",
});

const DetailText = styled.Text({
  color: "#aaa",
  fontSize: screenWidth <= 400 ? 12 : 14,
});

const ProfileSummary = styled.View({
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  padding: 10,
  borderRadius: 8,
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "space-between",
  marginHorizontal: 15,
});

const Headline = styled.View({
  flexDirection: "row",
  alignItems: "center",
  marginTop: 10,
  marginRight: 20,
  gap: 6,
});

const CCRankContainer = styled.View({
  gap: 5,
  alignItems: "center",
  flexDirection: "row",
  alignSelf: "flex-start",
});

const MedalContainer = styled.View({
  alignItems: "center",
});

const MedalName = styled.Text({
  color: "white",
  marginTop: 10,
  fontSize: 12,
});

const Tab = styled.TouchableOpacity(({ isSelected }) => ({
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 20,
  borderWidth: isSelected ? 2 : 1,
  borderColor: isSelected ? "#00A2FF" : "white",
  marginHorizontal: 5,
  alignItems: "center",
  justifyContent: "center",
  minWidth: screenWidth * 0.25,
}));

const TabText = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 12 : 14,
});

const ProfileContent = styled.View({
  flex: 1,
  paddingHorizontal: 20,
});

const Divider = styled.View({
  height: 1,
  backgroundColor: "#262626",
  marginVertical: 10,
});

const SectionTitle = styled.Text({
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
  marginBottom: 5,
});

const SectionContent = styled.Text({
  color: "white",
  fontSize: 14,
});

const styles = StyleSheet.create({
  tabContent: {
    paddingBottom: 40,
    paddingHorizontal: 5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "90%",
    height: "70%",
    borderRadius: 10,
  },
});

export default React.memo(UserProfile);
