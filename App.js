import React, { useEffect, useRef } from "react";
import * as Updates from "expo-updates";
import { SafeAreaView, Platform } from "react-native";
import { GameProvider } from "./context/GameContext";
import { UserProvider } from "./context/UserContext";
import { PopupProvider } from "./context/PopupContext";
import { LeagueProvider } from "./context/LeagueContext";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";


import { registerForPushNotificationsAsync } from "./services/pushNotifications";

import Tabs from "./navigation/tabs";

const Stack = createStackNavigator();
const navigationRef = React.createRef();

export default function App() {

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // request permissions and set up Android notification channel
    const setupNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Notification permissions not granted");
        return;
      }

      // android notification channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          sound: "default",
          enableVibration: true,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      try {
        const userId = await AsyncStorage.getItem("userId");
        console.log("App.js: Retrieved userId from AsyncStorage:", userId);
        if (userId) {
          await registerForPushNotificationsAsync(userId);
          // Alert.alert("Success", "Push notifications set up successfully!");
        } else {
          console.log("App.js: No userId found in AsyncStorage");
        }
      } catch (error) {
        console.error("App.js: Error registering push notifications:", error);
        // Alert.alert("Error", "Push notifications not set up. Please try again later." + error.message);
      }
    };

    setupNotifications();
    
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

    checkForUpdates();

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("Notification tapped:", data);

        // Navigate to Notifications tab
        if (navigationRef.current) {
          navigationRef.current?.navigate("NotificationsStack", {
            screen: "Notification",
            params: { notificationData: data },
          });
        } else {
          console.log("Navigation reference is not ready");
          Alert.alert("Error", "Navigation is not ready");
        }
      }
    );

    // Listener for notifications received while the app is in the foreground
    const backgroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received in background:", JSON.stringify(notification, null, 2));
      }
    );

    return () => {
      subscription.remove();
      backgroundSubscription.remove();
    };

  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PopupProvider>
        <UserProvider>
          <LeagueProvider>
            <GameProvider>
              <NavigationContainer ref={navigationRef}>
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
