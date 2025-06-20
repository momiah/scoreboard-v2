import { doc, collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase.config";

import { profileDetailSchema } from "../schemas/schema";

const getAllUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    const users = querySnapshot.docs.map((doc) => ({
      // id: doc.id,
      ...doc.data(),
    }));
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const resetUsersProfileDetails = async (usernames) => {
  try {
    if (!usernames || usernames.length === 0) {
      console.log("No usernames provided to reset");
      return { success: false, message: "No usernames provided" };
    }

    // Step 1: Get all users from the 'users' collection
    const allUsers = await getAllUsers();

    if (!allUsers || allUsers.length === 0) {
      console.error("No users found in database");
      return { success: false, message: "No users found in database" };
    }

    // Step 2: Filter users to get only those whose usernames match the provided array
    const usersToReset = allUsers.filter((user) =>
      usernames.includes(user.username)
    );

    if (usersToReset.length === 0) {
      console.log("No matching users found for the provided usernames");
      return { success: false, message: "No matching users found" };
    }

    console.log(
      `Found ${usersToReset.length} users to reset:`,
      usersToReset.map((u) => u.username)
    );

    // Step 3: Reset each user's profileDetail using their userId
    const resetPromises = usersToReset.map(async (user) => {
      try {
        const userRef = doc(db, "users", user.userId);

        // Only update the profileDetail field, keeping all other user data intact
        await updateDoc(userRef, {
          profileDetail: profileDetailSchema,
        });

        console.log(
          `✅ Reset profileDetail for user: ${user.username} (${user.userId})`
        );
        return { success: true, username: user.username, userId: user.userId };
      } catch (error) {
        console.error(
          `❌ Failed to reset profileDetail for user: ${user.username}`,
          error
        );
        return {
          success: false,
          username: user.username,
          userId: user.userId,
          error: error.message,
        };
      }
    });

    // Step 4: Execute all reset operations
    const results = await Promise.all(resetPromises);

    // Step 5: Analyze results
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`\n=== RESET SUMMARY ===`);
    console.log(`✅ Successfully reset: ${successful.length} users`);
    console.log(`❌ Failed to reset: ${failed.length} users`);

    if (successful.length > 0) {
      console.log(
        "Successfully reset users:",
        successful.map((r) => r.username)
      );
    }

    if (failed.length > 0) {
      console.log(
        "Failed to reset users:",
        failed.map((r) => `${r.username} (${r.error})`)
      );
    }

    return {
      success: true,
      totalRequested: usernames.length,
      totalFound: usersToReset.length,
      totalSuccess: successful.length,
      totalFailed: failed.length,
      successfulUsers: successful,
      failedUsers: failed,
    };
  } catch (error) {
    console.error("Error in resetUsersProfileDetails:", error);
    return {
      success: false,
      message: "Function execution failed",
      error: error.message,
    };
  }
};

// Usage example:
// const usernamesToReset = ["player1", "player2", "player3"];
// const result = await resetUsersProfileDetails(usernamesToReset);
// console.log("Reset operation result:", result);
