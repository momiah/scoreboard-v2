import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase v9+ imports
import { firebaseApp } from "../services/firebase.config"; // Your Firebase app initialization

export const fetchImageBlob = (uri) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new TypeError("Network request failed"));
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
};

export const uploadLeagueImage = async (uri, leagueId) => {
  try {
    const blob = await fetchImageBlob(uri);
    const filePath = `LeagueImages/${leagueId}_${Date.now()}.jpg`;
    const storage = getStorage(firebaseApp);
    const storageRef = ref(storage, filePath);
    const uploadTask = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(uploadTask.ref);
    return downloadURL;
  } catch (error) {
    console.error("Image upload error:", error);
    return null;
  }
};
