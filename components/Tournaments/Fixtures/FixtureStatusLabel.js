import styled from "styled-components/native";

export const FixtureStatusLabel = styled.Text(({ status }) => ({
  paddingHorizontal: 6,
  paddingVertical: 2,
  marginTop: 8,
  fontSize: 9,
  color: "white",
  backgroundColor:
    status === "Scheduled"
      ? "rgba(0, 162, 255, 0.6)"
      : status === "Approved" || status === "approved"
        ? "rgba(0, 255, 0, 0.6)"
        : status === "disputed"
          ? "rgba(255, 59, 48, 0.7)"
          : "rgba(255, 165, 0, 0.6)",
  borderRadius: 4,
  overflow: "hidden",
}));
