import React, { memo, useRef, useState } from "react";
import { Pressable, Text as RNText, TextInput, View } from "react-native";
import type { UserProfile } from "@shared/types";
import { HarnessFilterContext, SeedButton } from "./harness/HarnessButton";
import HarnessExpected from "./harness/HarnessExpected";
import { HARNESS_SECTIONS } from "./sections";

const UNLOCK_TAPS = 5;

export const cleanupAllTestData = async (testUser: UserProfile) => {
  const outcomes: Record<string, unknown> = {};
  const failures: string[] = [];
  for (const { id, cleanup } of HARNESS_SECTIONS) {
    if (!cleanup) continue;
    try {
      outcomes[id] = await cleanup({ testUser });
    } catch (error) {
      failures.push(`${id}: ${String(error)}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`CLEANUP INCOMPLETE. ${failures.join(" | ")}`);
  }
  return outcomes;
};

const HarnessButtons = memo(({ currentUser }: { currentUser: UserProfile }) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
    <SeedButton
      id="maestro-cleanup-test-data"
      label="Delete All Test Data"
      success="Cleaned up"
      failure="Cleanup failed"
      run={() => cleanupAllTestData(currentUser)}
    />
    {HARNESS_SECTIONS.map(({ id, Buttons }) => (
      <Buttons key={id} currentUser={currentUser} />
    ))}
  </View>
));
HarnessButtons.displayName = "HarnessButtons";

const MaestroHarness = ({ currentUser }: { currentUser: UserProfile }) => {
  const [taps, setTaps] = useState(0);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChangeFilter = (text: string) => {
    setDraft(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFilter(text), 500);
  };

  return (
    <>
      <Pressable
        testID="maestro-harness-unlock"
        accessibilityLabel="maestro-harness-unlock"
        style={{ height: 24 }}
        onPress={() => setTaps((count) => count + 1)}
      />
      {taps >= UNLOCK_TAPS ? (
        <HarnessFilterContext.Provider value={filter}>
          <TextInput
            testID="maestro-harness-filter"
            accessibilityLabel="maestro-harness-filter"
            value={draft}
            onChangeText={onChangeFilter}
            onFocus={() => onChangeFilter("")}
            clearTextOnFocus
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="filter"
            placeholderTextColor="#888"
            style={{ color: "white", fontSize: 12, height: 28, padding: 2 }}
          />
          <RNText
            testID="maestro-harness-filter-applied"
            accessibilityLabel={filter}
            style={{ color: "#888", fontSize: 8 }}
          >
            {filter}
          </RNText>
          <HarnessExpected />
          <HarnessButtons currentUser={currentUser} />
        </HarnessFilterContext.Provider>
      ) : null}
    </>
  );
};

export default MaestroHarness;
