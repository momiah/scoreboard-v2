import React from "react";
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
      <Stack.Screen name="League" component={League} />
      <Stack.Screen name="UserProfile" component={UserProfile} />
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
      initialRouteName="UserProfileScreen"
    >
      <Stack.Screen name="UserProfileScreen" component={UserProfile} />
      <Stack.Screen name="League" component={League} />
      <Stack.Screen name="ProfileMenu" component={ProfileMenu} />
      <Stack.Screen name="EditProfile" component={EditProfile} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
    </Stack.Navigator>
  );
};

// Tabs Navigator
const Tabs = () => {
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
          } else if (route.name === "UserProfile") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "Notifications") {
            iconName = focused ? "notifications" : "notifications-outline";
          } else if (route.name === "Schedule") {
            iconName = focused ? "calendar" : "calendar-outline";
          }

          // Return the appropriate icon
          return (
            <Ionicons
              style={{ paddingTop: 5 }}
              name={iconName}
              size={size}
              color={color}
            />
          );
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
      <Tab.Screen i name="Home" component={HomeStack} />
      <Tab.Screen name="Notifications" component={Notifications} />
      {/* <Tab.Screen name="Schedule" component={Schedule} /> */}
      <Tab.Screen name="UserProfile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

export default Tabs;
