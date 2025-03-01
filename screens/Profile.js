import React, { useContext, useState, useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { UserContext } from "../context/UserContext";
import styled from "styled-components/native";
import CourtChampsLogo from "../assets/court-champ-logo-icon.png";
import { Dimensions } from "react-native";
import MedalDisplay from "../components/performance/MedalDisplay";
import { useRoute } from "@react-navigation/native";
import { GameContext } from "../context/GameContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimateNumber from "../components/performance/AnimateNumber";
import PerformanceStats from "../components/performance/PerformanceStats";
import MedalProgress from "../components/performance/MedalProgress";
import ResultLog from "../components/performance/ResultLog";
import MatchMedals from "../components/performance/MatchMedals";
import { trophies } from "../mockImages";
import LeagueStatsDisplay from "../components/performance/LeagueStatDisplay";

const { width: screenWidth } = Dimensions.get("window");
const screenAdjustedStatFontSize = screenWidth <= 400 ? 20 : 25;
const screenAdjustedMedalSize = screenWidth <= 400 ? 70 : 80;

const Profile = () => {
  const route = useRoute();
  const { getUserById, getGlobalRank } = useContext(UserContext);
  const { medalNames } = useContext(GameContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("Profile");
  const [globalRank, setGlobalRank] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      let userId = route.params?.userId;
      if (!userId) {
        userId = await AsyncStorage.getItem("userId");
      }
      if (!userId) {
        console.error("No user id available to fetch profile.");
        setLoading(false);
        return;
      }

      try {
        const userProfile = await getUserById(userId);
        setProfile(userProfile);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [route.params, getUserById]);

  useEffect(() => {
    const fetchRank = async () => {
      if (profile && profile.userId) {
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

  console.log("profile", JSON.stringify(profile, null, 2));

  const profileDetail = profile?.profileDetail;
  const leagueStats = profileDetail?.leagueStats;

  if (loading) {
    return <ActivityIndicator color="#fff" size="large" />;
  }

  if (!profile) {
    return <Text style={{ color: "white" }}>Profile not found.</Text>;
  }

  // Now that profile is available, compute the statData.
  const statData = [
    {
      statTitle: "Wins",
      stat: (
        <AnimateNumber
          number={profileDetail?.numberOfWins || 0}
          fontSize={screenAdjustedStatFontSize}
        />
      ),
    },
    {
      statTitle: "Losses",
      stat: (
        <AnimateNumber
          number={profileDetail?.numberOfLosses || 0}
          fontSize={screenAdjustedStatFontSize}
        />
      ),
    },
    {
      statTitle: "Win Ratio",
      stat: (
        <Stat>
          {profileDetail && profileDetail.numberOfLosses !== 0
            ? (
                profileDetail.numberOfWins / profileDetail.numberOfLosses
              ).toFixed(2)
            : 0}
        </Stat>
      ),
    },
    {
      statTitle: "Highest Streak",
      stat: (
        <AnimateNumber
          number={profileDetail?.highestWinStreak || 0}
          fontSize={screenAdjustedStatFontSize}
        />
      ),
    },
  ];

  const tabs = [
    { component: "Profile" },
    { component: "Performance" },
    // { component: "Game Log" },
  ];

  const renderComponent = () => {
    switch (selectedTab) {
      case "Profile":
        return <Text>Performance</Text>;
      case "Performance":
        return (
          <>
            <MedalProgress
              xp={profileDetail?.XP}
              prevGameXp={profileDetail?.prevGameXP}
            />
            <Divider />
            <MatchMedals
              demonWin={profileDetail?.demonWin}
              winStreak3={profileDetail?.winStreak3}
              winStreak5={profileDetail?.winStreak5}
              winStreak7={profileDetail?.winStreak7}
            />
            <Divider />
            <LeagueStatsDisplay leagueStats={leagueStats} />
            <PerformanceStats
              statData={statData}
              selectedPlayer={profileDetail}
            />
          </>
        );
      // POST MVP
      // case "Game Log":
      //   return <GameLog userId={profile.userId} />;
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "rgb(3,16,31)" }}>
      <Overview>
        <PlayerDetail>
          <Avatar source={CourtChampsLogo} />
          <View style={{ gap: 2 }}>
            <PlayerName>{profile?.username}</PlayerName>
            <Text
              style={{
                color: "#aaa",
                fontSize: screenWidth <= 400 ? 12 : 14,
              }}
            >
              Member since June
            </Text>
            <Text
              style={{
                color: "#aaa",
                fontSize: screenWidth <= 400 ? 12 : 14,
              }}
            >
              Last Active Today
            </Text>
            <Text
              style={{
                color: "#aaa",
                fontSize: screenWidth <= 400 ? 12 : 14,
              }}
            >
              Global Rank: #{globalRank}
            </Text>
            <Text
              style={{
                color: "#aaa",
                fontSize: screenWidth <= 400 ? 12 : 14,
                padding: 5,
                backgroundColor: "rgb(40, 40, 40)",
                borderRadius: 5,
                border: "1px solid rgb(255, 255, 255)",
                alignSelf: "flex-start",
              }}
            >
              {profileDetail?.XP.toFixed(0)} XP
            </Text>
          </View>
        </PlayerDetail>
        <MedalContainer>
          <MedalDisplay xp={profileDetail?.XP} size={screenAdjustedMedalSize} />
          <Text style={{ color: "white", marginTop: 10, fontSize: 12 }}>
            {medalNames(profileDetail?.XP)}
          </Text>
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
    </View>
  );
};

const Overview = styled.View({
  padding: 20,
  flexDirection: "row",
  width: "100%",
  justifyContent: "space-between",
  alignItems: "center",
});

const ProfileContent = styled.ScrollView({
  padding: 20,
});

const Divider = styled.View({
  borderBottomColor: "#262626",
  borderBottomWidth: 1,
});

// Replace your TabsContainer with a flex container (not a ScrollView)
const TabsContainer = styled.View({
  flexDirection: "row",
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
  paddingTop: 25,
  paddingBottom: 10,
  paddingHorizontal: 10,
});

// Each Tab will take an equal share of the available width.
const Tab = styled.TouchableOpacity(({ isSelected }) => ({
  flex: 1,
  paddingVertical: 10,
  borderRadius: 20,
  borderWidth: isSelected ? 2 : 1,
  borderColor: isSelected ? "#00A2FF" : "white",
  justifyContent: "center",
  alignItems: "center",
  marginHorizontal: 5, // optional spacing between tabs
}));

const TabText = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 12 : 14,
});

const Avatar = styled.Image({
  width: 70,
  height: 70,
  borderRadius: 35,
  borderWidth: 2,
  borderColor: "#00A2FF",
  marginBottom: 5,
});

const PlayerDetail = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
});

const MedalContainer = styled.View({
  flexDirection: "column",
  alignItems: "center",
});

const PlayerName = styled.Text({
  fontSize: 25,
  color: "white",
  fontWeight: "bold",
});

const Stat = styled.Text({
  fontSize: screenAdjustedStatFontSize,
  fontWeight: "bold",
  color: "white",
});

export default Profile;
