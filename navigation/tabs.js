import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Home from "../screens/Home/Home";
import Leagues from "../screens/Home/Leagues/Leagues";
import League from "../screens/Home/Leagues/League";
import UserProfile from "../screens/Profile/UserProfile";
import ProfileMenu from "../screens/Profile/ProfileMenu";
import EditProfile from "../screens/Profile/EditProfile";
import Notifications from "../screens/Notifications";
import Schedule from "../screens/Schedule";
import AllPlayers from "../screens/Home/AllPlayers";
import Ionicons from "@expo/vector-icons/Ionicons";
import Login from "../screens/Authentication/Login";
import Signup from "../screens/Authentication/Signup";
import EditLeague from "../screens/Home/Leagues/EditLeague";
import PendingInvites from "../screens/Home/Leagues/PendingInvites";
import LeagueSettings from "../screens/Home/Leagues/LeagueSettings";
import AssignAdmin from "../screens/Home/Leagues/AssignAdmin";
import AccountSupport from "../screens/Profile/AccountSupport";
import UserFeedback from "../screens/Profile/UserFeedback";
import { UserContext } from "../context/UserContext";
import { View } from "react-native";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home Stack
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
      <Stack.Screen name="League" component={League} />
      <Stack.Screen name="UserProfile" component={UserProfile} />
      <Stack.Screen name="UserFeedback" component={UserFeedback} />
      <Stack.Screen name="ProfileMenu" component={ProfileMenu} />
      <Stack.Screen name="AccountSupport" component={AccountSupport} />
      <Stack.Screen name="AllPlayers" component={AllPlayers} />

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
      <Stack.Screen name="ProfileMenu" component={ProfileMenu} />
      <Stack.Screen name="EditProfile" component={EditProfile} />
      <Stack.Screen name="UserFeedback" component={UserFeedback} />
      <Stack.Screen name="AccountSupport" component={AccountSupport} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
    </Stack.Navigator>
  );
};

const NotificationsStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Notification"
    >
      <Stack.Screen name="Notification" component={Notifications} />
      <Stack.Screen name="League" component={League} />
      <Stack.Screen name="EditLeague" component={EditLeague} />
      <Stack.Screen name="LeagueSettings" component={LeagueSettings} />
      <Stack.Screen name="PendingInvites" component={PendingInvites} />
      <Stack.Screen name="AssignAdmin" component={AssignAdmin} />
      <Stack.Screen name="UserProfile" component={UserProfile} />
      <Stack.Screen name="ProfileMenu" component={ProfileMenu} />
      <Stack.Screen name="UserFeedback" component={UserFeedback} />
      <Stack.Screen name="AccountSupport" component={AccountSupport} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
    </Stack.Navigator>
  );
};

const TabIcon = ({ focused, name, color, size, hasNotification }) => {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        marginTop: 5,
      }}
    >
      <Ionicons
        //  style={{ padding: 5 }}
        name={name}
        size={size}
        color={color}
      />
      {hasNotification && (
        <View
          style={{
            position: "absolute",
            right: -6,
            top: 0,
            backgroundColor: "red",
            borderRadius: 6,
            width: 12,
            height: 12,
            justifyContent: "center",
            alignItems: "center",
          }}
        />
      )}
    </View>
  );
};

// Tabs Navigator
const Tabs = () => {
  const { notifications } = useContext(UserContext);

  const unreadNotifications = notifications.filter(
    (notification) => notification.isRead === false
  ).length;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveBackgroundColor: "rgb(3, 16, 31)",
        tabBarInactiveBackgroundColor: "rgb(3, 16, 31)",
        tabBarActiveTintColor: "#FFD700",
        tabBarInactiveTintColor: "#A9A9A9",
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
            return (
              <TabIcon
                name={iconName}
                color={color}
                size={size}
                hasNotification={false}
              />
            );
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
            return (
              <TabIcon
                name={iconName}
                color={color}
                size={size}
                hasNotification={false}
              />
            );
          } else if (route.name === "Notifications") {
            iconName = focused ? "notifications" : "notifications-outline";
            return (
              <TabIcon
                name={iconName}
                color={color}
                size={size}
                hasNotification={unreadNotifications > 0}
              />
            );
          } else if (route.name === "Schedule") {
            iconName = focused ? "calendar" : "calendar-outline";
            return (
              <TabIcon
                name={iconName}
                color={color}
                size={size}
                hasNotification={false}
              />
            );
          }
        },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#262626",
        },
        tabBarLabel: () => null, // Remove label
        headerShown: false, // Hide the header
      })}
    >
      {/* Replace Home component with HomeStack */}
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsStack}
        options={{
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : null,
          tabBarBadgeStyle: {
            backgroundColor: "red",
            color: "white",
          },
        }}
      />
      {/* <Tab.Screen name="Schedule" component={Schedule} /> */}
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

export default Tabs;
