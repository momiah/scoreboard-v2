import React from "react";
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native";
import styled from "styled-components/native";

const { width: screenWidth } = Dimensions.get("window");
const screenAdjustedFontSize = screenWidth <= 405 ? 16 : 18;

const ResultLog = ({ resultLog }) => {
  return (
    <LogContainer>
      {resultLog.map((result, index) => (
        <Result
          key={index}
          style={[styles.result, result === "W" ? styles.win : styles.loss]}
        >
          {result}
        </Result>
      ))}
    </LogContainer>
  );
};

const LogContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#00152B",
  padding: 10,
  borderRadius: 5,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
});

const Result = styled.Text({
  fontSize: screenAdjustedFontSize,
  fontWeight: "bold",
});

const styles = StyleSheet.create({
  win: {
    color: "green",
  },
  loss: {
    color: "red",
  },
});

export default ResultLog;
