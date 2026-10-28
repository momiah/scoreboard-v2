import React, { useState } from "react";
import { View } from "react-native";
import styled from "styled-components/native";

import { RankInformation } from "../../Modals/RankInformation";
import MedalProgress from "../../performance/MedalProgress";
import { PulseRing, Reveal } from "../../ladder/HowToPlayReveal";
import { highQualityRanks, ranks } from "../../../rankingMedals/ranking/ranks";
import { BLUE, BODY, BRONZE, GlowDisc } from "../SignupChrome";
import { Eyebrow, Headline, IntroScrollCompact } from "../introStyles";

const LEVEL_COLOURS = [
  BRONZE,
  "rgb(211, 231, 243)",
  "rgb(234, 54, 54)",
  "rgb(249, 206, 40)",
];

const HERO_SIZE = 88;
const beginnerLevels = ranks.slice(0, 4);
const heroMedal = highQualityRanks[0]?.icon;

const RankPage: React.FC = () => {
  const [ranksOpen, setRanksOpen] = useState(false);

  return (
    <IntroScrollCompact>
      <Reveal>
        <Eyebrow>YOUR RANK</Eyebrow>
      </Reveal>
      <Reveal order={1} from="pop">
        <Hero>
          <GlowDisc size={HERO_SIZE * 1.7} color={BRONZE} opacity={0.5} />
          <PulseRing size={HERO_SIZE} color={BRONZE} />
          <HeroMedal source={heroMedal} resizeMode="contain" />
        </Hero>
      </Reveal>
      <Reveal order={1}>
        <Headline style={{ fontSize: 28 }}>Beginner</Headline>
      </Reveal>
      <Reveal order={2} style={fullWidth}>
        <MedalProgress xp={20} prevGameXp={null} />
      </Reveal>
      <Reveal order={3}>
        <Copy>
          Win games to earn CP. Each badge has four levels: bronze, silver,
          ruby, then gold.
        </Copy>
      </Reveal>
      <Reveal order={3} style={fullWidth}>
        <LevelRow>
          {beginnerLevels.map((rank, index) => (
            <Level key={rank.name}>
              <LevelMedalWrap>
                <GlowDisc
                  size={72}
                  color={LEVEL_COLOURS[index] ?? BRONZE}
                  opacity={0.5}
                />
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
    </IntroScrollCompact>
  );
};

const fullWidth = { alignSelf: "stretch" as const, width: "100%" as const };

const Hero = styled(View)({
  width: HERO_SIZE,
  height: HERO_SIZE,
  alignItems: "center",
  justifyContent: "center",
});

const HeroMedal = styled.Image({
  width: HERO_SIZE - 8,
  height: HERO_SIZE - 8,
});

const Copy = styled.Text({
  color: BODY,
  fontSize: 14,
  lineHeight: 20,
  textAlign: "center",
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
  width: 46,
  height: 46,
  alignItems: "center",
  justifyContent: "center",
});

const LevelMedal = styled.Image({
  width: 40,
  height: 40,
});

const LevelName = styled.Text({
  color: "#ffffff",
  fontSize: 12,
  fontWeight: "700",
  textAlign: "center",
});

const LevelCp = styled.Text({
  color: "#9fb8c8",
  fontSize: 11,
  textAlign: "center",
});

const AllRanksButton = styled.TouchableOpacity({
  marginTop: 4,
  paddingVertical: 10,
  paddingHorizontal: 28,
  borderRadius: 12,
  borderWidth: 1.5,
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
