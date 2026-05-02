import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase v9+ imports
import { storage } from "../services/firebase.config"; // Your Firebase app initialization

/**
 * React Native local images use file:// URIs; XMLHttpRequest often fails on those.
 * Prefer fetch(); fall back to XHR for environments where fetch is unsupported.
 */
export const fetchImageBlob = async (uri) => {
  try {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`fetch image failed: ${response.status}`);
    }
    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error("empty image blob");
    }
    return blob;
  } catch (fetchErr) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(fetchErr ?? new TypeError("Network request failed"));
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });
  }
};

export const uploadLeagueImage = async (uri, leagueId) => {
  try {
    const blob = await fetchImageBlob(uri);
    const filePath = `LeagueImages/${leagueId}_${Date.now()}.jpg`;

    const storageRef = ref(storage, filePath);
    const uploadTask = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(uploadTask.ref);
    return downloadURL;
  } catch (error) {
    console.error("Image upload error:", error);
    return null;
  }
};
