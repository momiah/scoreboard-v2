import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase.config";

export const retrieveGames = async () => {
  try {
    // Assuming `db` is your initialized Firestore instance
    const scoreboardCollectionRef = collection(db, "scoreboard");

    // Optional: Order games by date (descending)
    const sortQuery = query(scoreboardCollectionRef, orderBy("date", "desc"));

    const querySnapshot = await getDocs(
      sortQuery ? sortQuery : scoreboardCollectionRef
    ); // Use querySnapshot

    const games = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(), // Spread operator to get all game data fields
    }));

    return games; // Return the retrieved games
  } catch (error) {
    console.error("Error retrieving games:", error);
    return []; // Return an empty array in case of errors
  }
};
