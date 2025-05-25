import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Clipboard,
} from "react-native";
import { useRef } from "react";

export const copyLocationAddress = (location, timeoutRef, setIsCopied) => {
  if (!location) return;
  const address = `${location.courtName}, ${location.address}, ${location.city}, ${location.postCode}, ${location.countryCode}`;

  Clipboard.setString(address);
  setIsCopied(true);

  // Clear existing timeout and reset after 1.5 seconds
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(() => setIsCopied(false), 1500);
};
