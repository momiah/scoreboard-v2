import React from "react";
import { ScrollView, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface RuleSection {
  title: string;
  body: string;
}

const RULES: RuleSection[] = [
  {
    title: "How ladders work",
    body: "Players are ranked on a ladder. Challenge others to climb, and hold your position by defending against challengers.",
  },
  {
    title: "Registration",
    body: "Join while registration is open. Paid ladders require the entry fee before you are added to the standings.",
  },
  {
    title: "Playing games",
    body: "Arrange challenge games with other ladder members. Report each result — both players confirm the score before it counts.",
  },
  {
    title: "Check-in & no-shows",
    body: "Check in at the court for every match; the games unlock once every player has checked in. If your opponent hasn't checked in within 30 minutes of the start time, you can report a no-show from the check-in screen. Misconduct — cheating, abuse or harassment — can be reported from the match menu.",
  },
  {
    title: "Rescheduling & extensions",
    body: "Before any game is reported, either side can ask to move the match to a new time; it only moves if the opponent accepts. Once a game has been reported, either side can extend the match once, giving 7 days from the request to finish it. Playoff matches must still finish by the playoff deadline.",
  },
  {
    title: "Inactive matches",
    body: "An accepted match expires if nothing happens — no check-in, game or report — for 72 hours. The clock starts at the scheduled time and resets with any activity, so any progress keeps the match alive.",
  },
  {
    title: "Playoffs",
    body: "When the season ends, the top-ranked players enter the playoff bracket to decide the champion.",
  },
  {
    title: "Playoff matches",
    body: "Each playoff game is two matches, one at each player's home court, and both must be played within 10 days. A coin toss decides who hosts the first match. The player who wins more games across both matches goes through. If it's level, one deciding game is played at the second match's court, straight after it, with both players already checked in. If you can't stay for it, either player can reschedule it before the deadline.",
  },
  {
    title: "Prizes",
    body: "The prize pot is shared among the top finishers once the ladder completes and results are finalised.",
  },
];

const LadderRules: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  return (
    <Screen>
      <TopBar>
        <BackButton onPress={() => navigation.goBack()} testID="ladder-rules-back">
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </BackButton>
        <TopBarTitle>Ladder Rules</TopBarTitle>
        <View style={{ width: 26 }} />
      </TopBar>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        {RULES.map((rule) => (
          <RuleCard key={rule.title}>
            <RuleTitle>{rule.title}</RuleTitle>
            <RuleBody>{rule.body}</RuleBody>
          </RuleCard>
        ))}
      </ScrollView>
    </Screen>
  );
};

export default LadderRules;

const Screen = styled.View({
  flex: 1,
  backgroundColor: "#00152B",
});

const TopBar = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 15,
  paddingVertical: 15,
});

const BackButton = styled.TouchableOpacity({
  padding: 2,
});

const TopBarTitle = styled.Text({
  color: "#ffffff",
  fontSize: 18,
  fontWeight: "bold",
});

const RuleCard = styled.View({
  padding: 16,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  borderWidth: 1,
  borderColor: "#192336",
  gap: 8,
});

const RuleTitle = styled.Text({
  color: "#00A2FF",
  fontSize: 15,
  fontWeight: "bold",
});

const RuleBody = styled.Text({
  color: "#cccccc",
  fontSize: 14,
  lineHeight: 20,
});
