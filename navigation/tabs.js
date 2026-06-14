import React, {
  useContext,
  // useState
} from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Home from "../screens/Home/Home";
import Leagues from "../screens/Home/Leagues/Leagues";
import League from "../screens/Home/Leagues/League";
import Tournament from "../screens/Home/Tournaments/Tournament";
import UserProfile from "../screens/Profile/UserProfile";
import ProfileMenu from "../screens/Profile/ProfileMenu";
import EditProfile from "../screens/Profile/EditProfile";
import Notifications from "../screens/Notifications";
import AllPlayers from "../screens/Home/AllPlayers";
import Ionicons from "@expo/vector-icons/Ionicons";
import Login from "../screens/Authentication/Login";
import Signup from "../screens/Authentication/Signup";
import EditLeague from "../screens/Home/Leagues/EditLeague";
import PendingInvites from "../screens/Home/Settings/PendingInvites";
import UserPendingInvites from "../screens/Profile/UserPendingInvites";
import CompetitionPendingRequests from "../screens/Home/Settings/CompetitionPendingRequests";
import LeagueSettings from "../screens/Home/Leagues/LeagueSettings";
import AssignAdmin from "../screens/Home/Settings/AssignAdmin";
import RemovePlayers from "../screens/Home/Settings/RemovePlayers";
import AccountSupport from "../screens/Profile/AccountSupport";
import UserFeedback from "../screens/Profile/UserFeedback";
import PendingRequests from "../screens/Profile/PendingRequests";
import BulkGamePublisher from "../screens/Home/Leagues/BulkGamePublisher";
import TournamentSettings from "../screens/Home/Tournaments/TournamentSettings";
import BulkFixturesPublisher from "../screens/Home/Tournaments/BulkFixturesPublisher";
import EditTournament from "../screens/Home/Tournaments/EditTournament";
import Tournaments from "../screens/Home/Tournaments/Tournaments";
import FAQ from "../screens/Profile/FAQ";
import LinkedAccounts from "../screens/Profile/LinkedAccounts";
import Chats from "../screens/Chats";
import CompetitionsScreen from "../screens/Competition/CompetitionScreen";
import { UserContext } from "../context/UserContext";
import { View } from "react-native";
import InvitePlayer from "../screens/InvitePlayer";
import GameScreen from "../screens/GameScreen";
// import { getUnitId } from "../utils/getAdMobUnitId";
// import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
// const BANNER_UNIT_ID = getUnitId();

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="HomeMain"
    >
      <Stack.Screen name="HomeMain" component={Home} />
      <Stack.Screen name="Leagues" component={Leagues} />
      <Stack.Screen name="EditLeague" component={EditLeague} />
      <Stack.Screen name="LeagueSettings" component={LeagueSettings} />
      <Stack.Screen name="PendingInvites" component={PendingInvites} />
      <Stack.Screen name="AssignAdmin" component={AssignAdmin} />
      <Stack.Screen name="RemovePlayers" component={RemovePlayers} />
      <Stack.Screen name="League" component={League} />
      <Stack.Screen name="UserProfile" component={UserProfile} />
      <Stack.Screen name="UserFeedback" component={UserFeedback} />
      <Stack.Screen name="ProfileMenu" component={ProfileMenu} />
      <Stack.Screen name="AccountSupport" component={AccountSupport} />
      <Stack.Screen name="PendingRequests" component={PendingRequests} />
      <Stack.Screen name="UserPendingInvites" component={UserPendingInvites} />
      <Stack.Screen
        name="CompetitionPendingRequests"
        component={CompetitionPendingRequests}
      />
      <Stack.Screen name="AllPlayers" component={AllPlayers} />
      <Stack.Screen name="BulkGamePublisher" component={BulkGamePublisher} />
      <Stack.Screen name="FAQ" component={FAQ} />
      <Stack.Screen name="LinkedAccounts" component={LinkedAccounts} />
      <Stack.Screen name="Tournament" component={Tournament} />
      <Stack.Screen name="Tournaments" component={Tournaments} />
      <Stack.Screen name="InvitePlayer" component={InvitePlayer} />
      <Stack.Screen name="GameScreen" component={GameScreen} />
      <Stack.Screen
        name="BulkFixturesPublisher"
        component={BulkFixturesPublisher}
      />
      <Stack.Screen name="TournamentSettings" component={TournamentSettings} />
      <Stack.Screen name="EditTournament" component={EditTournament} />

      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="UserProfile"
    >
      <Stack.Screen name="UserProfile" component={UserProfile} />
      <Stack.Screen name="League" component={League} />
      <Stack.Screen name="EditLeague" component={EditLeague} />
      <Stack.Screen name="LeagueSettings" component={LeagueSettings} />
      <Stack.Screen name="PendingInvites" component={PendingInvites} />
      <Stack.Screen name="AssignAdmin" component={AssignAdmin} />
      <Stack.Screen name="RemovePlayers" component={RemovePlayers} />
      <Stack.Screen name="ProfileMenu" component={ProfileMenu} />
      <Stack.Screen name="BulkGamePublisher" component={BulkGamePublisher} />
      <Stack.Screen name="FAQ" component={FAQ} />
      <Stack.Screen name="UserPendingInvites" component={UserPendingInvites} />
      <Stack.Screen
        name="CompetitionPendingRequests"
        component={CompetitionPendingRequests}
      />
      <Stack.Screen name="EditProfile" component={EditProfile} />
      <Stack.Screen name="UserFeedback" component={UserFeedback} />
      <Stack.Screen name="AccountSupport" component={AccountSupport} />
      <Stack.Screen name="PendingRequests" component={PendingRequests} />
      <Stack.Screen name="LinkedAccounts" component={LinkedAccounts} />
      <Stack.Screen name="InvitePlayer" component={InvitePlayer} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="Tournament" component={Tournament} />
      <Stack.Screen name="Tournaments" component={Tournaments} />
      <Stack.Screen name="GameScreen" component={GameScreen} />
      <Stack.Screen
        name="BulkFixturesPublisher"
        component={BulkFixturesPublisher}
      />
      <Stack.Screen name="TournamentSettings" component={TournamentSettings} />
      <Stack.Screen name="EditTournament" component={EditTournament} />
    </Stack.Navigator>
  );
};

const ChatsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Chats"
    >
      <Stack.Screen name="Chats" component={Chats} />
      <Stack.Screen name="League" component={League} />
      <Stack.Screen name="EditLeague" component={EditLeague} />
      <Stack.Screen name="LeagueSettings" component={LeagueSettings} />
      <Stack.Screen name="PendingInvites" component={PendingInvites} />
      <Stack.Screen name="AssignAdmin" component={AssignAdmin} />
      <Stack.Screen name="RemovePlayers" component={RemovePlayers} />
      <Stack.Screen name="UserProfile" component={UserProfile} />
      <Stack.Screen name="ProfileMenu" component={ProfileMenu} />
      <Stack.Screen name="UserFeedback" component={UserFeedback} />
      <Stack.Screen name="AccountSupport" component={AccountSupport} />
      <Stack.Screen name="PendingRequests" component={PendingRequests} />
      <Stack.Screen name="UserPendingInvites" component={UserPendingInvites} />
      <Stack.Screen
        name="CompetitionPendingRequests"
        component={CompetitionPendingRequests}
      />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="BulkGamePublisher" component={BulkGamePublisher} />
      <Stack.Screen name="InvitePlayer" component={InvitePlayer} />
      <Stack.Screen name="FAQ" component={FAQ} />
      <Stack.Screen name="LinkedAccounts" component={LinkedAccounts} />
      <Stack.Screen name="Tournament" component={Tournament} />
      <Stack.Screen name="Tournaments" component={Tournaments} />
      <Stack.Screen name="GameScreen" component={GameScreen} />
      <Stack.Screen
        name="BulkFixturesPublisher"
        component={BulkFixturesPublisher}
      />
      <Stack.Screen name="TournamentSettings" component={TournamentSettings} />
      <Stack.Screen name="EditTournament" component={EditTournament} />
    </Stack.Navigator>
  );
};

const CompetitionsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="CompetitionsList"
    >
      <Stack.Screen name="CompetitionsList" component={CompetitionsScreen} />
      <Stack.Screen name="League" component={League} />
      <Stack.Screen name="EditLeague" component={EditLeague} />
      <Stack.Screen name="LeagueSettings" component={LeagueSettings} />
      <Stack.Screen name="PendingInvites" component={PendingInvites} />
      <Stack.Screen name="AssignAdmin" component={AssignAdmin} />
      <Stack.Screen name="RemovePlayers" component={RemovePlayers} />
      <Stack.Screen name="UserProfile" component={UserProfile} />
      <Stack.Screen name="ProfileMenu" component={ProfileMenu} />
      <Stack.Screen name="UserFeedback" component={UserFeedback} />
      <Stack.Screen name="AccountSupport" component={AccountSupport} />
      <Stack.Screen name="UserPendingInvites" component={UserPendingInvites} />
      <Stack.Screen
        name="CompetitionPendingRequests"
        component={CompetitionPendingRequests}
      />
      <Stack.Screen name="PendingRequests" component={PendingRequests} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="BulkGamePublisher" component={BulkGamePublisher} />
      <Stack.Screen name="InvitePlayer" component={InvitePlayer} />
      <Stack.Screen name="FAQ" component={FAQ} />
      <Stack.Screen name="LinkedAccounts" component={LinkedAccounts} />
      <Stack.Screen name="Tournament" component={Tournament} />
      <Stack.Screen name="Tournaments" component={Tournaments} />
      <Stack.Screen name="GameScreen" component={GameScreen} />
      <Stack.Screen
        name="BulkFixturesPublisher"
        component={BulkFixturesPublisher}
      />
      <Stack.Screen name="TournamentSettings" component={TournamentSettings} />
      <Stack.Screen name="EditTournament" component={EditTournament} />
      <Stack.Screen name="Notifications" component={Notifications} />
    </Stack.Navigator>
  );
};

const TabIcon = ({ name, color, size }) => {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        marginTop: 5,
      }}
    >
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
};

const Tabs = () => {
  const { chatSummaries, notifications } = useContext(UserContext);

  const unreadChats = chatSummaries.filter(
    (chat) => chat.isRead === false,
  ).length;

  const hasUnreadNotifications = notifications.some(
    (notification) => notification.isRead === false,
  );

  const initialRouteName = hasUnreadNotifications ? "Competitions" : "Profile";

  return (
    <>
      <Tab.Navigator
        initialRouteName={initialRouteName}
        screenOptions={({ route }) => ({
          tabBarActiveBackgroundColor: "rgb(3, 16, 31)",
          tabBarInactiveBackgroundColor: "rgb(3, 16, 31)",
          tabBarActiveTintColor: "#FFD700",
          tabBarInactiveTintColor: "#A9A9A9",
          tabBarStyle: {
            borderColor: "rgba(9, 33, 62, 1)",
            borderTopWidth: 1,
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "Home") {
              iconName = focused ? "home" : "home-outline";
              return <TabIcon name={iconName} color={color} size={size} />;
            } else if (route.name === "Competitions") {
              iconName = focused ? "trophy" : "trophy-outline";
              return <TabIcon name={iconName} color={color} size={size} />;
            } else if (route.name === "Profile") {
              iconName = focused ? "person" : "person-outline";
              return <TabIcon name={iconName} color={color} size={size} />;
            } else if (route.name === "ChatsTab") {
              iconName = focused ? "chatbubbles" : "chatbubbles-outline";

              return <TabIcon name={iconName} color={color} size={size} />;
            }
          },
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: "#262626",
          },
          tabBarLabel: () => null,
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen
          name="Competitions"
          component={CompetitionsStack}
          options={{
            tabBarBadge: hasUnreadNotifications ? "" : null,
            tabBarBadgeStyle: {
              backgroundColor: "red",
              minWidth: 16,
              maxHeight: 16,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: "rgb(3, 16, 31)",
              transform: [{ translateX: -2 }, { translateY: 4 }],
            },
          }}
        />

        <Tab.Screen
          name="ChatsTab"
          component={ChatsStack}
          options={{
            tabBarBadge: unreadChats > 0 ? unreadChats : null,
            tabBarBadgeStyle: {
              backgroundColor: "red",
              color: "white",
            },
          }}
        />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>

      {/* {showAd && (
        <View style={{ width: "100%", alignItems: "center" }}>
          <BannerAd
            unitId={BANNER_UNIT_ID}
            size={BannerAdSize.FULL_BANNER}
            onAdFailedToLoad={(error) => {
              console.error("Ad failed to load:", error);
              setShowAd(false);
            }}
            onAdLoaded={() => {
              console.log("Ad loaded successfully");
            }}
            requestOptions={{
              requestNonPersonalizedAdsOnly: false,
              networkExtras: { collapsible: "bottom" },
            }}
          />
        </View>
      )} */}
    </>
  );
};

export default Tabs;
