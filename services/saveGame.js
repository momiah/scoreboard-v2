import { setDoc, doc, collection } from "firebase/firestore";
import { db } from "./firebase.config";
import { Alert } from "react-native";

export const saveGame = async (newGame, selectedDate) => {
  try {
    const scoreboardCollectionRef = collection(db, "scoreboard");

    // Generate a unique document ID to prevent overwriting (optional)
    const gameDocRef = doc(scoreboardCollectionRef, "doc title");

    await setDoc(gameDocRef, newGame);
    Alert.alert("Success", "Game saved successfully!");
    console.log("Game saved successfully!");
  } catch (error) {
    console.error("Error saving game:", error);
    Alert.alert("Error", "Error saving game data");
  }
};
