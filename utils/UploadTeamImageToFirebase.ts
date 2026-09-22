import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../services/firebase.config";
import { fetchImageBlob } from "./UploadLeagueImageToFirebase";

function storageSafeSegment(id: string): string {
  return id.replace(/[/#[\]*?]/g, "_");
}

export const uploadTeamImage = async (
  uri: string,
  teamId: string,
): Promise<string | null> => {
  try {
    const blob = await fetchImageBlob(uri);
    const filePath = `TeamImages/${storageSafeSegment(teamId)}_${Date.now()}.jpg`;
    const storageRef = ref(storage, filePath);
    const uploadTask = await uploadBytes(storageRef, blob);
    return await getDownloadURL(uploadTask.ref);
  } catch (error) {
    console.error("Team image upload error:", error);
    return null;
  }
};
