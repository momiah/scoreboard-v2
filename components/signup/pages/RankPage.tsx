import React, { useState } from "react";
import { View } from "react-native";
import styled from "styled-components/native";

import { RankInformation } from "../../Modals/RankInformation";
import MedalProgress from "../../performance/MedalProgress";
import { PulseRing, Reveal } from "../../ladder/HowToPlayReveal";
import { highQualityRanks, ranks } from "../../../rankingMedals/ranking/ranks";
import { BLUE } from "../SignupChrome";
import { IntroScroll, IntroTitle } from "../introStyles";

const BRONZE = "rgb(194, 106, 46)";
const LEVEL_COLOURS = [
  BRONZE,
  "rgb(211, 231, 243)",
  "rgb(234, 54, 54)",
  "rgb(249, 206, 40)",
];

const HERO_SIZE = 128;
const beginnerLevels = ranks.slice(0, 4);
const heroMedal = highQualityRanks[0]?.icon;

const RankPage: React.FC = () => {
  const [ranksOpen, setRanksOpen] = useState(false);

  return (
    <IntroScroll>
      <Reveal>
        <IntroTitle>Your rank</IntroTitle>
      </Reveal>
      <Reveal order={1} from="pop">
        <Hero>
          <Glow />
          <PulseRing size={HERO_SIZE} color={BRONZE} />
          <HeroMedal source={heroMedal} resizeMode="contain" />
        </Hero>
      </Reveal>
      <Reveal order={2} style={fullWidth}>
        <MedalProgress xp={20} prevGameXp={null} />
      </Reveal>
      <Reveal order={3} style={fullWidth}>
        <LevelRow>
          {beginnerLevels.map((rank, index) => (
            <Level key={rank.name}>
              <LevelMedalWrap>
                <LevelGlow colour={LEVEL_COLOURS[index] ?? BRONZE} />
                <LevelMedal source={rank.icon} resizeMode="contain" />
              </LevelMedalWrap>
              <LevelName numberOfLines={1}>{rank.name}</LevelName>
              <LevelCp>{rank.xp} CP</LevelCp>
            </Level>
          ))}
        </LevelRow>
      </Reveal>
      <Reveal order={4}>
        <AllRanksButton
          onPress={() => setRanksOpen(true)}
          testID="signup-intro-all-ranks"
        >
          <AllRanksText>View all ranks</AllRanksText>
        </AllRanksButton>
      </Reveal>
      <RankInformation
        visible={ranksOpen}
        onClose={() => setRanksOpen(false)}
      />
    </IntroScroll>
  );
};

const fullWidth = { alignSelf: "stretch" as const, width: "100%" as const };

const Hero = styled(View)({
  width: HERO_SIZE,
  height: HERO_SIZE,
  alignItems: "center",
  justifyContent: "center",
});

const Glow = styled.View({
  position: "absolute",
  width: 96,
  height: 96,
  borderRadius: 48,
  backgroundColor: "rgba(194, 106, 46, 0.55)",
  shadowColor: BRONZE,
  shadowOpacity: 0.55,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 0 },
});

const HeroMedal = styled.Image({
  width: 100,
  height: 100,
});

const LevelRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  gap: 6,
});

const Level = styled.View({
  flex: 1,
  alignItems: "center",
  gap: 4,
});

const LevelMedalWrap = styled.View({
  width: 56,
  height: 56,
  alignItems: "center",
  justifyContent: "center",
});

const LevelGlow = styled.View<{ colour: string }>(
  ({ colour }: { colour: string }) => ({
  position: "absolute",
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: colour,
  opacity: 0.5,
  shadowColor: colour,
  shadowOpacity: 0.5,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 0 },
}));

const LevelMedal = styled.Image({
  width: 48,
  height: 48,
});

const LevelName = styled.Text({
  color: "#ffffff",
  fontSize: 11,
  fontWeight: "600",
  textAlign: "center",
});

const LevelCp = styled.Text({
  color: "#9fb8c8",
  fontSize: 11,
  textAlign: "center",
});

const AllRanksButton = styled.TouchableOpacity({
  marginTop: 8,
  paddingVertical: 12,
  paddingHorizontal: 28,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: BLUE,
  backgroundColor: "transparent",
  shadowColor: BLUE,
  shadowOpacity: 0.85,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 0 },
});

const AllRanksText = styled.Text({
  color: BLUE,
  fontSize: 15,
  fontWeight: "bold",
});

export default RankPage;
