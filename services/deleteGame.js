import { Alert } from "react-native";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebase.config";

export const deleteGame = async (gameId, setGames) => {
  // 1. Confirm Deletion (Optional)
  Alert.alert("Delete Game", "Are you sure you want to delete this game?", [
    { text: "Cancel", onPress: () => {}, style: "cancel" },
    {
      text: "Delete",
      onPress: async () => {
        // 2. Remove Game from State
        setGames((prevGames) =>
          prevGames.filter((game) => game.gameId !== gameId)
        );

        // 3. Remove game from Firebase
        try {
          const gameDocRef = doc(db, "scoreboard", gameId);
          await deleteDoc(gameDocRef);
          console.log("Game deleted successfully from Firebase!");
        } catch (error) {
          console.error("Error deleting game from Firebase:", error);
        }
      },
    },
  ]);
};
1;
