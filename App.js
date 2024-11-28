// App.js
import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { GameProvider } from "./context/GameContext";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Tabs from "./navigation/tabs";

const Stack = createStackNavigator();

export default function App() {
  return (
    <GameProvider>
      <NavigationContainer>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#00152B" }}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
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
