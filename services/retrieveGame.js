import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase.config";

const sortGamesByNewest = (games) => {
  return games.sort((a, b) => {
    const [dateA, gameNumberA] = a.gameId.split("-game-");
    const [dateB, gameNumberB] = b.gameId.split("-game-");

    const formattedDateA = dateA.split("-").reverse().join("-"); // Converts 11-06-2024 to 2024-06-11
    const formattedDateB = dateB.split("-").reverse().join("-"); // Converts 11-06-2024 to 2024-06-11

    if (formattedDateA === formattedDateB) {
      return parseInt(gameNumberB) - parseInt(gameNumberA); // Newest game number first
    }

    return new Date(formattedDateB) - new Date(formattedDateA); // Newest date first
  });
};

export const retrieveGames = async () => {
  try {
    // Assuming `db` is your initialized Firestore instance
    const scoreboardCollectionRef = collection(db, "scoreboard");

    // Optional: Order games by date (descending)
    const sortQuery = query(scoreboardCollectionRef, orderBy("gameId", "desc"));

    const querySnapshot = await getDocs(
      sortQuery ? sortQuery : scoreboardCollectionRef
    ); // Use querySnapshot

    const games = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(), // Spread operator to get all game data fields
    }));

    const sortedGames = sortGamesByNewest(games);
    console.log("games", sortedGames);
    return games; // Return the retrieved games
  } catch (error) {
    console.error("Error retrieving games:", error);
    return []; // Return an empty array in case of errors
  }
};
