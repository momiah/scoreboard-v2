import React, { useState } from "react";
import { View } from "react-native";
import styled from "styled-components/native";

import { RankInformation } from "../../Modals/RankInformation";
import MedalProgress from "../../performance/MedalProgress";
import { PulseRing, Reveal } from "../../ladder/HowToPlayReveal";
import { highQualityRanks, ranks } from "../../../rankingMedals/ranking/ranks";
import { BLUE, BODY, BRONZE, GOLD, GlowDisc } from "../SignupChrome";
import { Eyebrow, Headline } from "../introStyles";

const LEVEL_COLOURS = [
  BRONZE,
  "rgb(211, 231, 243)",
  "rgb(234, 54, 54)",
  "rgb(249, 206, 40)",
];

const HERO_SIZE = 110;
const beginnerLevels = ranks.slice(0, 4);
const heroMedal = highQualityRanks[0]?.icon;

const RankPage: React.FC = () => {
  const [ranksOpen, setRanksOpen] = useState(false);

  return (
    <IntroScrollRank>
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
      <Reveal order={1} style={nameGroup}>
        <Headline style={{ fontSize: 26 }}>Beginner</Headline>
        <LevelBadge>Level 1</LevelBadge>
      </Reveal>
      <Reveal order={2} style={progressWrap}>
        <MedalProgress xp={20} prevGameXp={null} />
      </Reveal>
      <Reveal order={3} style={copyGroup}>
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
                  size={64}
                  color={LEVEL_COLOURS[index] ?? BRONZE}
                  opacity={0.5}
                />
                <LevelMedal source={rank.icon} resizeMode="contain" />
              </LevelMedalWrap>
              <LevelName numberOfLines={1}>{rank.name}</LevelName>
              <LevelCp>{rank.xp} CP</LevelCp>
              <LevelNumber>Lvl {index + 1}</LevelNumber>
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
    </IntroScrollRank>
  );
};

const nameGroup = { alignItems: "center" as const, gap: 2 };
const copyGroup = { marginTop: 20 };
const progressWrap = {
  alignSelf: "stretch" as const,
  width: "100%" as const,
  marginTop: -6,
  marginBottom: -10,
};

const IntroScrollRank = styled.ScrollView.attrs({
  contentContainerStyle: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 0,
    paddingBottom: 12,
    gap: 8,
  },
})({});

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

const LevelBadge = styled.Text({
  color: GOLD,
  fontSize: 15,
  fontWeight: "700",
  letterSpacing: 0.6,
});

const LevelNumber = styled.Text({
  color: BLUE,
  fontSize: 11,
  fontWeight: "700",
  textAlign: "center",
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
  marginTop: 20,
  marginBottom: 20,
});

const Level = styled.View({
  flex: 1,
  alignItems: "center",
  gap: 2,
});

const LevelMedalWrap = styled.View({
  width: 42,
  height: 42,
  alignItems: "center",
  justifyContent: "center",
});

const LevelMedal = styled.Image({
  width: 36,
  height: 36,
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
  paddingVertical: 7,
  paddingHorizontal: 24,
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
  fontSize: 14,
  fontWeight: "bold",
});

export default RankPage;
