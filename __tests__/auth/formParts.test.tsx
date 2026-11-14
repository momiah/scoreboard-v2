import React from "react";
import { Text, StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

import { GlassCard, PrimaryButton } from "../../components/signup/formParts";

const flat = (node: { props: { style?: unknown } }) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

it("PrimaryButton keeps its blue shadow with a real offset and opacity", () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  const { getByTestId } = render(
    <PrimaryButton label="Go" onPress={jest.fn()} testID="primary" />,
  );
  expect(flat(getByTestId("primary"))).toEqual(
    expect.objectContaining({
      shadowColor: "#00A2FF",
      shadowOpacity: 0.55,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      borderTopLeftRadius: 14,
      opacity: 1,
    }),
  );
  expect(warn).not.toHaveBeenCalled();
  warn.mockRestore();
});

it("PrimaryButton still fades when disabled", () => {
  const { getByTestId } = render(
    <PrimaryButton label="Go" onPress={jest.fn()} disabled testID="primary" />,
  );
  expect(flat(getByTestId("primary")).opacity).toBe(0.6);
});

it("GlassCard only adds the glow shadow when glow is on", () => {
  const glow = render(
    <GlassCard>
      <Text>in</Text>
    </GlassCard>,
  );
  const glowStyle = flat(glow.getByText("in").parent!.parent as never);
  expect(glowStyle).toEqual(
    expect.objectContaining({
      shadowOpacity: 0.3,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 0 },
      borderWidth: 1,
    }),
  );

  const plain = render(
    <GlassCard glow={false}>
      <Text>in</Text>
    </GlassCard>,
  );
  const plainStyle = flat(plain.getByText("in").parent!.parent as never);
  expect(plainStyle.shadowOpacity).toBeUndefined();
  expect(plainStyle.borderWidth).toBe(0);
});
