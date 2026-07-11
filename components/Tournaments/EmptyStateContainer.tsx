import React from "react";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";

interface EmptyStateContainerProps {
  emptyStateMessage?: string;
  userRole?: string;
  handleShowGenerateFixtures?: () => void;
  label?: string;
}

export const EmptyStateContainer = ({
  emptyStateMessage,
  userRole,
  handleShowGenerateFixtures,
  label,
}: EmptyStateContainerProps) => {
  console.log("user role", userRole);
  return (
    <Content>
      <StateContainer>
        <EmptyStateIcon>
          <AntDesign name="calendar" size={64} color="#ccc" />
        </EmptyStateIcon>
        <EmptyStateText>No {label} generated yet</EmptyStateText>
        <EmptyStateSubtext>{emptyStateMessage}</EmptyStateSubtext>
        {userRole === "admin" && (
          <GenerateButton onPress={handleShowGenerateFixtures}>
            <AntDesign
              name="plus"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <GenerateButtonText>Generate {label}</GenerateButtonText>
          </GenerateButton>
        )}
      </StateContainer>
    </Content>
  );
};

const Content = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
});

const StateContainer = styled.View({
  alignItems: "center",
  maxWidth: 300,
});

const EmptyStateIcon = styled.View({
  marginBottom: 20,
  opacity: 0.6,
});

const EmptyStateText = styled.Text({
  fontSize: 18,
  fontWeight: "600",
  color: "#fff",
  textAlign: "center",
  marginBottom: 8,
});

const EmptyStateSubtext = styled.Text({
  fontSize: 14,
  color: "#ccc",
  textAlign: "center",
  marginBottom: 32,
  lineHeight: 20,
});

const GenerateButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#00A2FF",
  paddingHorizontal: 24,
  paddingVertical: 14,
  borderRadius: 8,
  shadowColor: "#00A2FF",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 5,
});

const GenerateButtonText = styled.Text({
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
});
