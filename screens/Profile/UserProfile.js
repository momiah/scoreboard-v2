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
} from "react-native";
import { UserContext } from "../../context/UserContext";
import styled from "styled-components/native";
import CourtChampsLogo from "../../assets/court-champ-logo-icon.png";
import { useRoute } from "@react-navigation/native";
import { GameContext } from "../../context/GameContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MedalDisplay from "../../components/performance/MedalDisplay";

import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import ProfileActivity from "../../components/Profiles/ProfileActivity";
import ProfilePerformance from "../../components/Profiles/ProfilePerformance";
import RankSuffix from "../../components/RankSuffix";
import { formatNumber } from "../../functions/formatNumber";

const { width: screenWidth } = Dimensions.get("window");
const screenAdjustedMedalSize = screenWidth <= 400 ? 70 : 80;
const screenAdjustedStatFontSize = screenWidth <= 400 ? 15 : 18;

const UserProfile = () => {
  const route = useRoute();
  const { getUserById, getGlobalRank, currentUser, profileViewCount } =
    useContext(UserContext);
  const { medalNames, findRankIndex } = useContext(GameContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("Profile");
  const [globalRank, setGlobalRank] = useState(null);

  const navigation = useNavigation();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // 1. Check if viewing another user's profile
        if (route.params?.userId) {
          const userProfile = await getUserById(route.params.userId);
          setProfile(userProfile);
        }
        // 2. Use currentUser data for own profile
        else if (currentUser) {
          setProfile(currentUser);
        }
        // 3. Fallback (shouldn't normally happen)
        else {
          const userId = await AsyncStorage.getItem("userId");
          if (userId) {
            const userProfile = await getUserById(userId);
            setProfile(userProfile);
          } else {
            setProfile(null); // Trigger redirect fallback
          }
        }
      } catch (error) {
        console.error("Profile load error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [route.params?.userId, currentUser]); // currentUser as dependency

  useEffect(() => {
    const trackProfileView = async () => {
      try {
        // Only track if viewing another user's profile
        if (
          route.params?.userId &&
          route.params.userId !== currentUser?.userId
        ) {
          await profileViewCount(route.params.userId);
        }
      } catch (error) {
        console.error("Profile view tracking failed:", error);
      }
    };

    // Only track after profile is loaded
    if (profile && !loading) {
      trackProfileView();
    }
  }, [profile, loading, currentUser?.userId, route.params?.userId]);

  // Global rank fetching
  useEffect(() => {
    const fetchRank = async () => {
      if (profile?.userId) {
        try {
          const rank = await getGlobalRank(profile.userId);
          setGlobalRank(rank);
        } catch (error) {
          console.error("Error fetching global rank:", error);
        }
      }
    };

    fetchRank();
  }, [profile, getGlobalRank]);

  useEffect(() => {
    if (!route.params?.userId && !profile && !loading) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  }, [profile, loading]);

  const profileDetail = profile?.profileDetail;

  const tabs = useMemo(
    () => [
      { component: "Profile" },
      { component: "Performance" },
      { component: "Activity" },
    ],
    []
  );

  const sections = useMemo(
    () => [
      {
        title: "Name",
        getValue: () => `${profile?.firstName} ${profile?.lastName}`.trim(),
        fallback: "",
      },
      { title: "Location", key: "location", fallback: "Location not provided" },
      {
        title: "Hand Preference",
        key: "handPreference",
        fallback: "Not provided",
      },
      { title: "Bio", key: "bio", fallback: "Bio not provided" },
      { title: "Contact", key: "email", fallback: "Email not provided" },
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
    [profile, profileDetail]
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
    [sections, profile]
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
      default:
        return null;
    }
  }, [selectedTab, renderProfileContent]);

  if (loading || (!route.params?.userId && !profile)) {
    return (
      <LoadingContainer>
        <ActivityIndicator color="#fff" size="large" />
      </LoadingContainer>
    );
  }

  const isOwnProfile =
    !route.params?.userId || route.params?.userId === currentUser?.userId;

  const profileXp = formatNumber(profileDetail.XP.toFixed(0));
  const rankLevel = findRankIndex(profileXp) + 1;

  console.log("point different", profileDetail?.totalPointDifference);

  return (
    <Container>
      {isOwnProfile && (
        <TouchableOpacity
          style={{ alignSelf: "flex-end", paddingHorizontal: 20 }}
          onPress={() => navigation.navigate("ProfileMenu")}
        >
          <Ionicons name="menu" size={30} color="#aaa" />
        </TouchableOpacity>
      )}
      <Overview>
        <PlayerDetail>
          <Avatar source={CourtChampsLogo} />
          <DetailColumn>
            <PlayerName>{profile?.username}</PlayerName>

            <DetailText>{profileXp ?? 0} XP</DetailText>

            <DetailText>
              {formatNumber(profileDetail?.totalPointDifference ?? 0)} PD
            </DetailText>
          </DetailColumn>
        </PlayerDetail>
        <MedalContainer>
          <MedalDisplay xp={profileDetail?.XP} size={screenAdjustedMedalSize} />
          <MedalName>{medalNames(profileDetail?.XP)}</MedalName>
          <MedalName style={{ fontWeight: "bold" }}>{rankLevel}</MedalName>
        </MedalContainer>
      </Overview>
      <ProfileSummary>
        <CCRankContainer>
          <XpText>CC Rank</XpText>
          <RankSuffix
            number={globalRank}
            numberStyle={{
              fontSize: screenAdjustedStatFontSize,
              color: "white",
            }}
            suffixStyle={{
              color: "rgba(255,255,255,0.7)",
            }}
          />
        </CCRankContainer>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <DetailText>{formatNumber(profile?.profileViews ?? 0)}</DetailText>
          <Ionicons name="eye" size={15} color="#aaa" />
        </View>
      </ProfileSummary>
      <TabsContainer>
        {tabs.map((tab) => (
          <Tab
            key={tab.component}
            onPress={() => setSelectedTab(tab.component)}
            isSelected={selectedTab === tab.component}
          >
            <TabText>{tab.component}</TabText>
          </Tab>
        ))}
      </TabsContainer>

      <ProfileContent>{renderComponent()}</ProfileContent>
    </Container>
  );
};

// Styled components
const ProfileSummary = styled.View({
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  border: "1px solid rgb(26, 28, 54)",
  padding: 10, // you can adjust based on screen size if needed
  borderRadius: 8,
  alignItems: "center",
  flexDirection: "row",
  // alignSelf: "flex-start",
  justifyContent: "space-between",
  marginHorizontal: 15,
});

const Container = styled.View`
  flex: 1;
  background-color: rgb(3, 16, 31);
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: rgb(3, 16, 31);
`;

const Overview = styled.View`
  padding: 20px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const PlayerDetail = styled.View`
  flex-direction: row;
  gap: 20px;
  flex: 1;
`;

const DetailColumn = styled.View`
  flex: 1;
  gap: 2px;
`;

const Avatar = styled.Image`
  width: 70px;
  height: 70px;
  border-radius: 35px;
  border-width: 2px;
  border-color: #00a2ff;
`;

const PlayerName = styled.Text`
  font-size: 25px;
  color: white;
  font-weight: bold;
`;

const DetailText = styled.Text`
  color: #aaa;
  font-size: ${screenWidth <= 400 ? 12 : 14}px;
  align-items: center;
  flex-direction: row;
`;

const CCRankContainer = styled.View({
  // backgroundColor: "rgba(0, 0, 0, 0.3)",
  // border: "1px solid rgb(26, 28, 54)",
  // padding: 10, // you can adjust based on screen size if needed
  // borderRadius: 8,
  gap: 5,
  alignItems: "center",
  flexDirection: "row",
  alignSelf: "flex-start",
});

const XpText = styled.Text`
  color: #aaa;
  font-size: ${screenWidth <= 400 ? 12 : 14}px;
`;

const MedalContainer = styled.View`
  align-items: center;
`;

const MedalName = styled.Text`
  color: white;
  margin-top: 10px;
  font-size: 12px;
`;

const TabsContainer = styled.View`
  flex-direction: row;
  padding: 10px;
  border-top-left-radius: 30px;
  border-top-right-radius: 30px;
`;

const Tab = styled.TouchableOpacity`
  flex: 1;
  padding: 10px;
  border-radius: 20px;
  border-width: ${({ isSelected }) => (isSelected ? 2 : 1)}px;
  border-color: ${({ isSelected }) => (isSelected ? "#00A2FF" : "white")};
  margin-horizontal: 5px;
  align-items: center;
  justify-content: center;
`;

const TabText = styled.Text`
  color: white;
  font-size: ${screenWidth <= 400 ? 12 : 14}px;
`;

const ProfileContent = styled.View`
  flex: 1;
  padding-horizontal: 20px;
`;

const Divider = styled.View`
  height: 1px;
  background-color: #262626;
  margin-vertical: 10px;
`;

const SectionTitle = styled.Text`
  color: white;
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 5px;
`;

const SectionContent = styled.Text`
  color: white;
  font-size: 14px;
`;

// StyleSheet for optimized rendering
const styles = StyleSheet.create({
  errorText: {
    color: "white",
    fontSize: 18,
  },
  tabContent: {
    paddingBottom: 40,
    paddingHorizontal: 5,
  },
});

export default React.memo(UserProfile);
