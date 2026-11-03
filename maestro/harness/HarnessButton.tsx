import React, { createContext, useContext } from "react";
import { Alert, Text as RNText, TouchableOpacity } from "react-native";
import { setHarnessExpected, type HarnessExpectedValues } from "./HarnessExpected";

export const HarnessFilterContext = createContext("");

export const HarnessButton = (
  props: React.ComponentProps<typeof TouchableOpacity>,
) => {
  const filter = useContext(HarnessFilterContext);
  if (filter && !String(props.testID ?? "").includes(filter)) return null;
  return (
    <TouchableOpacity
      {...props}
      style={[{ width: "25%", paddingVertical: 1 }, props.style]}
    />
  );
};

export const Text = (props: React.ComponentProps<typeof RNText>) => (
  <RNText numberOfLines={1} {...props} style={[{ fontSize: 7 }, props.style]} />
);

export type SeedOutcome = { expected?: HarnessExpectedValues } & Record<
  string,
  unknown
>;

type SeedButtonProps = {
  id: string;
  label: string;
  run: () => Promise<SeedOutcome | unknown>;
  success?: string;
  failure?: string;
};

export const SeedButton = ({
  id,
  label,
  run,
  success = "Seeded",
  failure = "Seed failed",
}: SeedButtonProps) => (
  <HarnessButton
    testID={id}
    onPress={async () => {
      try {
        const outcome = await run();
        const values = (outcome as SeedOutcome | undefined)?.expected;
        if (values) setHarnessExpected(values);
        Alert.alert(success, JSON.stringify(outcome ?? {}));
      } catch (error) {
        Alert.alert(failure, String(error));
      }
    }}
  >
    <Text style={{ color: "white" }}>{label}</Text>
  </HarnessButton>
);
