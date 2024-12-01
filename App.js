// App.js
import React from "react";
import { SafeAreaView } from "react-native";
import { GameProvider } from "./context/GameContext";
import { NavigationContainer } from "@react-navigation/native";
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
