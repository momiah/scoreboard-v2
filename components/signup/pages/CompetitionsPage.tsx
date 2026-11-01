import React from "react";
import { Text } from "react-native";
import styled from "styled-components/native";

import { ladderOutline, medalOutline, trophyOutline } from "../assets";
import { Reveal } from "../../ladder/HowToPlayReveal";
import { BODY, GOLD } from "../SignupChrome";
import { Eyebrow, Headline, IntroScroll } from "../introStyles";
import SkeletonImage from "../SkeletonImage";

const CARDS: {
  key: string;
  title: string;
  body: string;
  icon: number;
  iconHeight: number;
}[] = [
  {
    key: "ladders",
    title: "Ladders",
    body: "Official competitions run by Court Champs. Climb the table and the top players will playoff for a chance to win cash prizes and CP bundles.",
    icon: ladderOutline,
    iconHeight: 50,
  },
  {
    key: "leagues",
    title: "Leagues",
    body: "Run by clubs and communities. Free play competition to log your games until an end date set by club managers. Join one, or create your own.",
    icon: trophyOutline,
    iconHeight: 46,
  },
  {
    key: "tournaments",
    title: "Tournaments",
    body: "Run by clubs and communities. Fixed teams and game fixtures played as Round Robin or Knockout style formats. Jump into an open one, or host your own.",
    icon: medalOutline,
    iconHeight: 56,
  },
];

const CompetitionsPage: React.FC = () => (
  <IntroScroll>
    <Reveal style={titleGroup}>
      <Eyebrow>THREE WAYS TO COMPETE</Eyebrow>
      <Headline style={{ fontSize: 28 }}>
        Pick your <Text style={{ color: GOLD }}>battleground.</Text>
      </Headline>
    </Reveal>
    {CARDS.map((card, index) => (
      <Reveal key={card.key} order={2 + index} from="right" style={cardStyle}>
        <Card>
          <IconSlot>
            <SkeletonImage
              source={card.icon}
              width={48}
              height={card.iconHeight}
            />
          </IconSlot>
          <CardCopy>
            <CardTitle>{card.title}</CardTitle>
            <CardBody>{card.body}</CardBody>
          </CardCopy>
        </Card>
      </Reveal>
    ))}
  </IntroScroll>
);

const titleGroup = { gap: 10, marginBottom: 14, alignItems: "center" as const };

const cardStyle = { alignSelf: "stretch" as const };

const Card = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 14,
  backgroundColor: "rgba(2, 10, 20, 0.72)",
  borderWidth: 1,
  borderColor: "rgba(0, 162, 255, 0.4)",
});

const IconSlot = styled.View({
  width: 48,
  alignItems: "center",
  justifyContent: "center",
});

const CardCopy = styled.View({
  flex: 1,
  gap: 3,
});

const CardTitle = styled.Text({
  color: "#ffffff",
  fontSize: 17,
  fontWeight: "bold",
});

const CardBody = styled.Text({
  color: BODY,
  fontSize: 13,
  lineHeight: 18,
});

export default React.memo(CompetitionsPage);
