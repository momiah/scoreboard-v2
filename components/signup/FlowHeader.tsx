import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import styled from "styled-components/native";

import { MUTED } from "./SignupChrome";

interface FlowHeaderProps {
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
  testIDPrefix?: string;
}

/** Chevron on the left, a quiet text action on the right. Matches the top row of every mockup. */
const FlowHeader: React.FC<FlowHeaderProps> = ({
  onBack,
  rightLabel,
  onRightPress,
  testIDPrefix = "flow",
}) => (
  <Row>
    {onBack ? (
      <Side onPress={onBack} testID={`${testIDPrefix}-back`} hitSlop={12}>
        <Ionicons name="chevron-back" size={24} color="#c9d6e3" />
      </Side>
    ) : (
      <Spacer />
    )}
    {rightLabel ? (
      onRightPress ? (
        <Side
          onPress={onRightPress}
          testID={`${testIDPrefix}-right`}
          hitSlop={12}
        >
          <RightText>{rightLabel}</RightText>
        </Side>
      ) : (
        <RightText>{rightLabel}</RightText>
      )
    ) : null}
  </Row>
);

const Row = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  height: 44,
  paddingHorizontal: 22,
});

const Side = styled.TouchableOpacity({
  minWidth: 32,
  height: 44,
  justifyContent: "center",
});

const Spacer = styled.View({ width: 32 });

const RightText = styled.Text({
  color: MUTED,
  fontSize: 15,
});

export default FlowHeader;
