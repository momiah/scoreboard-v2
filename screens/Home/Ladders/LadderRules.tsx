import React, { useContext } from "react";
import { ScrollView, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NavigationProp,
  ParamListBase,
  RouteProp,
} from "@react-navigation/native";

import { LADDER_PLAYOFF_TIE_DAYS } from "@shared";
import { LadderContext } from "../../../context/LadderContext";
import { ladderEntrantNoun } from "../../../helpers/ladderEntrantNoun";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface RuleSection {
  title: string;
  body: string;
}

const rulesFor = (noun: "player" | "team"): RuleSection[] => [
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
    body: "Check in at the court for every match; the games unlock once every player has checked in. If your opponent hasn't checked in within 30 minutes of the start time, you can report a no-show from the check-in screen. We confirm you're at the court when you report it, and you can't report one if your opponent has already arrived. Misconduct — cheating, abuse or harassment — can be reported from the match menu.",
  },
  {
    title: "Rescheduling & extensions",
    body: "Before any game is reported, either side can ask to move the match to a new time; it only moves if the opponent accepts. Once a game has been reported, either side can extend the match once, giving 7 days from the request to finish it. An extension never runs past the day ladder results close, and playoff matches must still finish by the playoff deadline.",
  },
  {
    title: "Inactive matches",
    body: "An accepted match expires if nothing happens — no check-in, game or report — for 72 hours. The clock starts at the scheduled time and resets with any activity, so any progress keeps the match alive.",
  },
  {
    title: "Before the playoffs",
    body: "Matches can be posted and accepted until 7 days before the playoffs start. Results close 5 days before: after that no more games or no-shows can be reported, and any unfinished match ends, keeping the games already approved. Disputes and no-show claims are decided by our admins until 1 day before. Anything still undecided then is closed so the standings are final: a disputed game is discarded and neither side gets its CP, and a no-show is only awarded if our records show the reporter at the court and their opponent not there.",
  },
  {
    title: "Playoffs",
    body: `When the season ends, the top-ranked ${noun}s enter the playoff bracket to decide the champion.`,
  },
  {
    title: "Playoff matches",
    body: `Each playoff tie is two matches, one at each ${noun}'s home court, and both must be played within ${LADDER_PLAYOFF_TIE_DAYS} days. The lower-ranked ${noun} arranges their home match first. Once it's arranged, the higher-ranked ${noun} can arrange theirs for any date before the deadline, even an earlier one, so you can work around each other. The ${noun} that wins more games across both matches goes through. If it's level, one deciding game is played at the court of whichever match was played last, straight after it, with everyone already checked in. If you can't stay for it, either side can reschedule it before the deadline. Once match 1 is finished, either side can offer to play match 2 at the same court there and then; the other side can accept or decline.`,
  },
  {
    title: "Prizes",
    body: "The prize pot is shared among the top finishers once the ladder completes and results are finalised.",
  },
];

const LadderRules: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, { ladderId?: string }>, string>>();
  const { ladderById } = useContext(LadderContext);
  const ladderType =
    ladderById && ladderById.ladderId === route.params?.ladderId
      ? ladderById.ladderType
      : undefined;
  const rules = rulesFor(ladderEntrantNoun(ladderType));

  return (
    <Screen>
      <TopBar>
        <BackButton
          onPress={() => navigation.goBack()}
          testID="ladder-rules-back"
        >
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </BackButton>
        <TopBarTitle>Ladder Rules</TopBarTitle>
        <View style={{ width: 26 }} />
      </TopBar>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        {rules.map((rule) => (
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
