// App.js
import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet } from "react-native";
import Home from "./components/Home";
import { GameProvider } from "./context/GameContext";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <GameProvider>
        <Home />
      </GameProvider>
      <StatusBar style="auto" />
    </SafeAreaView>
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
