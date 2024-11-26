// App.js
import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet } from "react-native";
import Home from "./screens/Home/Home";
import Profile from "./screens/Profile";
import Notifications from "./screens/Notifications";
import Schedule from "./screens/Schedule";
import Leagues from "./screens/Home/Leagues";
import { GameProvider } from "./context/GameContext";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { View, Text } from "react-native";
import Tabs from "./navigation/tabs";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

export default function App() {
  return (
    <GameProvider>
      <NavigationContainer>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#00152B" }}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false, // Hide stack headers
            }}
          >
            <Stack.Screen name="Tabs" component={Tabs} />
          </Stack.Navigator>
        </SafeAreaView>
      </NavigationContainer>
    </GameProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#00152B",
    alignItems: "center",
    justifyContent: "center",
  },
});
