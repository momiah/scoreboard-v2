import React, { useState } from "react";
import { StyleSheet } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface MatchRequestBannerProps {
  testID: string;
  message: string;
  awaiting: boolean;
  destructive?: boolean;
  onDecline?: () => Promise<void>;
  onAccept?: () => void | Promise<void>;
}

const MatchRequestBanner: React.FC<MatchRequestBannerProps> = ({
  testID,
  message,
  awaiting,
  destructive = false,
  onDecline,
  onAccept,
}) => {
  const [responding, setResponding] = useState(false);

  if (awaiting) {
    return (
      <Banner testID={`${testID}-awaiting`}>
        <MessageRow>
          <Ionicons name="time-outline" size={16} color="#9fb8c8" />
          <BannerText>{message}</BannerText>
        </MessageRow>
      </Banner>
    );
  }

  const respond = async (action?: () => void | Promise<void>) => {
    if (!action) return;
    setResponding(true);
    try {
      await action();
    } finally {
      setResponding(false);
    }
  };

  return (
    <Banner testID={`${testID}-request`}>
      <MessageRow>
        <Ionicons name="alert-circle-outline" size={16} color="#9fb8c8" />
        <BannerText>{message}</BannerText>
      </MessageRow>
      <Actions>
        {onDecline ? (
          <DeclineButton
            disabled={responding}
            onPress={() => respond(onDecline)}
            testID={`${testID}-decline`}
          >
            <DeclineText>Decline</DeclineText>
          </DeclineButton>
        ) : null}
        <AcceptButton
          disabled={responding}
          onPress={() => respond(onAccept)}
          testID={`${testID}-accept`}
          style={destructive ? styles.destructive : styles.positive}
        >
          <AcceptText style={{ color: destructive ? "#ff8aa0" : "#7fd0ff" }}>
            Accept
          </AcceptText>
        </AcceptButton>
      </Actions>
    </Banner>
  );
};

export default MatchRequestBanner;

const styles = StyleSheet.create({
  destructive: {
    borderColor: "rgba(255, 75, 110, 0.6)",
    backgroundColor: "rgba(255, 75, 110, 0.12)",
  },
  positive: {
    borderColor: "rgba(0, 162, 255, 0.6)",
    backgroundColor: "rgba(0, 162, 255, 0.12)",
  },
});

const Banner = styled.View({
  gap: 10,
  marginHorizontal: 20,
  marginTop: 12,
  marginBottom: 12,
  padding: 12,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: "rgba(255, 255, 255, 0.15)",
});

const MessageRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
});

const BannerText = styled.Text({
  flex: 1,
  color: "#cbd5e1",
  fontSize: 13,
});

const Actions = styled.View({
  flexDirection: "row",
  gap: 8,
});

const DeclineButton = styled.TouchableOpacity({
  flex: 1,
  height: 36,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.25)",
  alignItems: "center",
  justifyContent: "center",
});

const DeclineText = styled.Text({
  color: "#cbd5e1",
  fontWeight: "600",
  fontSize: 13,
});

const AcceptButton = styled.TouchableOpacity({
  flex: 1,
  height: 36,
  borderRadius: 8,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
});

const AcceptText = styled.Text({
  fontWeight: "600",
  fontSize: 13,
});
