import React from "react";
import { SafeAreaView } from "react-native";
import { GameProvider } from "./context/GameContext";
import { UserProvider } from "./context/UserContext";
import { PopupProvider } from "./context/PopupContext";
import { LeagueProvider } from "./context/LeagueContext";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Tabs from "./navigation/tabs";

const Stack = createStackNavigator();

export default function App() {
  return (
    <PopupProvider>
      <UserProvider>
        <LeagueProvider>
          <GameProvider>
            <NavigationContainer>
              <SafeAreaView
                style={{ flex: 1, backgroundColor: "rgb(3, 16, 31)" }}
              >
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
        </LeagueProvider>
      </UserProvider>
    </PopupProvider>
  );
}
