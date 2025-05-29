import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase v9+ imports
import { storage } from "../services/firebase.config"; // Your Firebase app initialization

// Function to fetch image as blob using XMLHttpRequest
const fetchImageBlob = (uri) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function () {
      reject(new TypeError("Network request failed"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
};

export const uploadProfileImage = async (uri, userId) => {
  try {
    console.log("🟡 Starting profile image upload...");

    // Fetch the image as a blob using XMLHttpRequest
    const blob = await fetchImageBlob(uri);
    if (!blob) {
      throw new Error("⚠️ Failed to fetch image blob.");
    }

    const filePath = `ProfileImages/${userId}_${new Date().getTime()}.jpg`;
    console.log(`⬆️ Uploading to: ${filePath} (type: image/jpeg)`);

    const storageRef = ref(storage, filePath); // Create reference for the file path

    // Upload blob to Firebase storage
    const uploadTaskSnapshot = await uploadBytes(storageRef, blob);

    // Once uploaded, get the download URL
    const downloadURL = await getDownloadURL(uploadTaskSnapshot.ref);
    console.log(`Upload success! File available at: ${downloadURL}`);

    // Return the download URL
    return downloadURL;
  } catch (error) {
    console.error("🔥 Error during image upload:", error);
    throw new Error("⚠️ Failed to upload image. Please try again.");
  }
};
