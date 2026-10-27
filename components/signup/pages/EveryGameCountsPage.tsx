import React from "react";
import { Dimensions } from "react-native";
import styled from "styled-components/native";

import { ScoreDisplay, TeamColumn } from "../../scoreboard/ScoreboardAtoms";
import { Reveal } from "../../ladder/HowToPlayReveal";
import { IntroScroll, IntroText, IntroTitle } from "../introStyles";

const screenWidth = Dimensions.get("window").width;
const lastMatchSize = screenWidth <= 405 ? 18 : 20;

interface SampleGame {
  key: string;
  you: number;
  opponent: number;
  pending: boolean;
}

const GAMES: SampleGame[] = [
  { key: "approved", you: 21, opponent: 17, pending: false },
  { key: "pending", you: 19, opponent: 21, pending: true },
];

const sampleDate = "27-10-2026";

const gameItem = (game: SampleGame) => ({
  approvalStatus: game.pending ? "pending" : "approved",
  videoCount: 0,
  date: sampleDate,
  team1: {
    score: game.you,
    player1: { displayName: "You" },
  },
  team2: {
    score: game.opponent,
    player1: { displayName: "Opponent" },
  },
});

const EveryGameCountsPage: React.FC = () => (
  <IntroScroll>
    <Reveal>
      <IntroTitle>Every game counts</IntroTitle>
    </Reveal>
    <Reveal order={1}>
      <IntroText>
        Each competition requires you to log your score. Once your opponent
        approves it, you earn Court Points (CP).
      </IntroText>
    </Reveal>
    {GAMES.map((game, index) => {
      const item = gameItem(game);
      return (
        <Reveal
          key={game.key}
          order={2 + index}
          from="right"
          style={cardWrap}
        >
          <GameCard style={{ opacity: game.pending ? 0.6 : 1 }}>
            <TeamColumn team="left" players={item.team1} leagueType="Singles" />
            <ScoreDisplay
              date={item.date}
              team1={item.team1.score}
              team2={item.team2.score}
              item={item}
            />
            <TeamColumn
              team="right"
              players={item.team2}
              leagueType="Singles"
            />
          </GameCard>
        </Reveal>
      );
    })}
    <Reveal order={4}>
      <LastMatch>
        <LastMatchValue>+20 CP</LastMatchValue>
        <LastMatchLabel>Last Match</LastMatchLabel>
      </LastMatch>
    </Reveal>
  </IntroScroll>
);

const cardWrap = { alignSelf: "stretch" as const };

/** Same card chrome as Scoreboard.tsx GameContainer. */
const GameCard = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: "#001123",
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  borderRadius: 8,
});

/** Same colours and sizes as MedalProgress's last-match line. */
const LastMatch = styled.View({
  alignItems: "center",
});

const LastMatchValue = styled.Text({
  color: "green",
  fontSize: lastMatchSize,
  fontWeight: "bold",
});

const LastMatchLabel = styled.Text({
  color: "#aaa",
  fontSize: 11,
  paddingLeft: 6,
});

export default EveryGameCountsPage;
