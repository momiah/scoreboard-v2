import React, { useState } from "react";
import { Alert, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import { getFunctions, httpsCallable } from "firebase/functions";
import { notificationSchema, socialMediaPlatforms } from "@/schemas/schema";

interface BroadcastPayload {
  message: string;
  type: string;
  data: {
    image: string;
    header: string;
    body: string;
    footer: string;
    buttons: typeof socialMediaPlatforms;
  };
}

interface BroadcastResponse {
  success: number;
  failed: number;
  total: number;
  mode: "test" | "broadcast";
}

interface BroadcastNotificationButtonProps {
  payload: BroadcastPayload;
  label?: string;
  testUserId?: string;
}

const BroadcastNotificationButton = ({
  payload,
  label = "Send Broadcast",
  testUserId,
}: BroadcastNotificationButtonProps) => {
  const [loading, setLoading] = useState(false);
  const isTestMode = !!testUserId;

  const handleBroadcast = () => {
    Alert.alert(
      isTestMode ? "🧪 Test Notification" : "📢 Send Broadcast",
      isTestMode
        ? `Send test notification to userId:\n${testUserId}`
        : `This will notify ALL users:\n\n"${payload.data.header}"\n\nAre you sure?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Send", style: "destructive", onPress: triggerBroadcast },
      ],
    );
  };

  const triggerBroadcast = async () => {
    setLoading(true);
    try {
      const firebaseFunctions = getFunctions();
      const broadcast = httpsCallable(
        firebaseFunctions,
        "broadcastNotification",
      );
      const result = await broadcast({
        payload: {
          ...notificationSchema,
          ...payload,
          createdAt: new Date(),
        },
        ...(testUserId && { testUserId }),
      });

      const { success, failed, total, mode } = result.data as BroadcastResponse;
      Alert.alert(
        mode === "test" ? "Test Complete ✅" : "Broadcast Complete ✅",
        `Sent to ${success}/${total} users${failed > 0 ? `\n${failed} failed` : ""}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      Alert.alert("Failed ❌", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onPress={handleBroadcast} disabled={loading}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <ButtonText>{label}</ButtonText>
      )}
    </Button>
  );
};

const Button = styled.TouchableOpacity<{ disabled: boolean }>(
  ({ disabled }: { disabled: boolean }) => ({
    backgroundColor: disabled ? "#555" : "#3498db",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
  }),
);

const ButtonText = styled.Text({
  color: "#fff",
  fontWeight: "bold",
  fontSize: 15,
});

export default BroadcastNotificationButton;
