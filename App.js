import React, { useEffect } from "react";
import * as Updates from "expo-updates";
import { SafeAreaView } from "react-native";
import { GameProvider } from "./context/GameContext";
import { UserProvider } from "./context/UserContext";
import { PopupProvider } from "./context/PopupContext";
import { LeagueProvider } from "./context/LeagueContext";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import mobileAds from "react-native-google-mobile-ads";

// Importing Expo Tracking Transparency for iOS tracking permissions
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Settings } from 'react-native-fbsdk-next';

import Tabs from "./navigation/tabs";

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    mobileAds()
      .initialize()
      .then((adapterStatuses) => {
        console.log("AdMob initialized:", adapterStatuses);
      })
      .catch((error) => {
        console.error("AdMob initialization failed:", error);
      });
  }, []);

  useEffect(() => {
    // Facebook SDK setup
    const initFacebook = async () => {
      const { status } = await requestTrackingPermissionsAsync();

      Settings.initializeSDK();

      if (status === 'granted') {
        Settings.setAdvertiserTrackingEnabled(true);
      }
    };

    const checkForUpdates = async () => {
      if (!__DEV__) {
        // Only check in production
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        } catch (error) {
          console.error("Error checking for updates:", error);
        }
      }
    };

    initFacebook();
    checkForUpdates();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PopupProvider>
        <UserProvider>
          <LeagueProvider>
            <GameProvider>
              <NavigationContainer>
                <BottomSheetModalProvider>
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
                </BottomSheetModalProvider>
              </NavigationContainer>
            </GameProvider>
          </LeagueProvider>
        </UserProvider>
      </PopupProvider>
    </GestureHandlerRootView>
  );
}
