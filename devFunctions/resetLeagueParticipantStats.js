import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase.config";
import { scoreboardProfileSchema } from "../schemas/schema";

export const resetLeagueParticipantStats = async (usernames, leagueId) => {
  try {
    if (!usernames || usernames.length === 0) {
      console.log("No usernames provided to reset");
      return { success: false, message: "No usernames provided" };
    }

    if (!leagueId) {
      console.log("No leagueId provided");
      return { success: false, message: "No leagueId provided" };
    }

    // Step 1: Get the league document
    const leagueRef = doc(db, "leagues", leagueId);
    const leagueDoc = await getDoc(leagueRef);

    if (!leagueDoc.exists()) {
      console.error("League not found");
      return { success: false, message: "League not found" };
    }

    const leagueData = leagueDoc.data();
    const leagueParticipants = leagueData.leagueParticipants || [];

    if (leagueParticipants.length === 0) {
      console.log("No participants found in the league");
      return { success: false, message: "No participants found in league" };
    }

    // Step 2: Filter participants to reset based on provided usernames
    const participantsToReset = leagueParticipants.filter((participant) =>
      usernames.includes(participant.username)
    );

    if (participantsToReset.length === 0) {
      console.log("No matching participants found for the provided usernames");
      return { success: false, message: "No matching participants found" };
    }

    console.log(
      `Found ${participantsToReset.length} league participants to reset:`,
      participantsToReset.map((p) => p.username)
    );

    // Step 3: Reset the stats while keeping core info intact
    const updatedParticipants = leagueParticipants.map((participant) => {
      // Only reset if this participant's username is in our list
      if (usernames.includes(participant.username)) {
        return {
          ...scoreboardProfileSchema, // Reset all stats
          username: participant.username, // Keep original username
          userId: participant.userId, // Keep original userId
          memberSince: participant.memberSince || "", // Keep original memberSince
          profileImage: participant.profileImage || "", // Keep original profileImage
        };
      }
      // Return unchanged if not in reset list
      return participant;
    });

    // Step 4: Update the league document with reset participants
    await updateDoc(leagueRef, {
      leagueParticipants: updatedParticipants,
    });

    console.log(
      `✅ Successfully reset league participant stats for ${participantsToReset.length} users in league: ${leagueId}`
    );
    console.log(
      "Reset participants:",
      participantsToReset.map((p) => p.username)
    );

    return {
      success: true,
      leagueId,
      totalRequested: usernames.length,
      totalFound: participantsToReset.length,
      resetParticipants: participantsToReset.map((p) => ({
        username: p.username,
        userId: p.userId,
      })),
    };
  } catch (error) {
    console.error("Error in resetLeagueParticipantStats:", error);
    return {
      success: false,
      message: "Function execution failed",
      error: error.message,
    };
  }
};

// Usage example:
// const usernamesToReset = ['Hussain', 'AnisZaman', 'Bokul'];
// const leagueId = "your-league-id";
// const result = await resetLeagueParticipantStats(usernamesToReset, leagueId);
// console.log("Reset operation result:", result);
