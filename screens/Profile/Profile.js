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

const { width: screenWidth } = Dimensions.get("window");
const screenAdjustedMedalSize = screenWidth <= 400 ? 70 : 80;

const Profile = () => {
  const route = useRoute();
  const { getUserById, getGlobalRank, currentUser } = useContext(UserContext);
  const { medalNames } = useContext(GameContext);
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
          const userProfile = await getUserById(userId);
          setProfile(userProfile);
        }
      } catch (error) {
        console.error("Profile load error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [route.params?.userId, currentUser]); // currentUser as dependency

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

  const profileDetail = profile?.profileDetail;

  const tabs = useMemo(
    () => [
      { component: "Profile" },
      { component: "Performance" },
      { component: "Activity" },
    ],
    []
  );

  const renderProfileContent = useCallback(
    () => (
      <View style={{ gap: 5, paddingTop: 10 }}>
        <SectionTitle>Name</SectionTitle>
        <SectionContent>
          {profile?.firstName} {profile?.lastName}
        </SectionContent>
        <Divider />
        <SectionTitle>Location</SectionTitle>
        <SectionContent>
          {profile?.location || "Location not provided"}
        </SectionContent>
        <Divider />
        <SectionTitle>Hand Preference</SectionTitle>
        <SectionContent>
          {profile?.handPreference || "Not provided"}
        </SectionContent>
        <Divider />
        <SectionTitle>Bio</SectionTitle>
        <SectionContent>{profile?.bio || "Bio not provided"}</SectionContent>
        <Divider />
        <SectionTitle>Contact</SectionTitle>
        <SectionContent>
          {profile?.email || "Email not provided"}
        </SectionContent>
        <Divider />
        <SectionTitle>Member Since</SectionTitle>
        <SectionContent>
          {profileDetail?.memberSince || "Date not available"}
        </SectionContent>
      </View>
    ),
    [profile, profileDetail]
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
        return <ProfilePerformance profile={profile} />;
      case "Activity":
        return <ProfileActivity profile={profile} />;
      default:
        return null;
    }
  }, [selectedTab, renderProfileContent]);

  if (loading) {
    return (
      <LoadingContainer>
        <ActivityIndicator color="#fff" size="large" />
      </LoadingContainer>
    );
  }

  if (!profile) {
    return (
      <LoadingContainer>
        <Text style={styles.errorText}>Profile not found.</Text>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      <TouchableOpacity
        style={{ alignSelf: "flex-end", paddingHorizontal: 20 }}
        onPress={() => navigation.navigate("ProfileMenu")}
      >
        <Ionicons
          // style={{ paddingTop: 5 }}
          name={"menu"}
          size={30}
          color={"#aaa"}
        />
      </TouchableOpacity>
      <Overview>
        <PlayerDetail>
          <Avatar source={CourtChampsLogo} />
          <DetailColumn>
            <PlayerName>{profile?.username}</PlayerName>
            <DetailText>Member since June</DetailText>
            <DetailText>Last Active Today</DetailText>
            <DetailText>Global Rank: #{globalRank}</DetailText>
            <XpBadge>
              <XpText>{profileDetail?.XP?.toFixed(0)} XP</XpText>
            </XpBadge>
          </DetailColumn>
        </PlayerDetail>
        <MedalContainer>
          <MedalDisplay xp={profileDetail?.XP} size={screenAdjustedMedalSize} />
          <MedalName>{medalNames(profileDetail?.XP)}</MedalName>
        </MedalContainer>
      </Overview>

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
`;

const XpBadge = styled.View`
  padding: 5px;
  background-color: rgb(40, 40, 40);
  border-radius: 5px;
  border: 1px solid white;
  align-self: flex-start;
  margin-top: 5px;
`;

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

export default React.memo(Profile);
