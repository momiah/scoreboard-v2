import React, { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
  TouchableOpacity,
  View,
} from "react-native";
import styled from "styled-components/native";
import Feather from "react-native-vector-icons/Feather";
import gameMedals from "../../rankingMedals";
import Ionicons from "@expo/vector-icons/Ionicons";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const faqs = [
  {
    question: "What is the purpose of Court Champs?",
    answer:
      "Court Champs allows badminton communities to create leagues and record their matches, empowering players to compete on leaderboards at league, country, and global levels — all based on a number of game metrics.",
  },
  {
    question: "How to use Court Champs?",
    answer: "Here’s a simple breakdown of how to get started:",
    sections: [
      {
        title: "Create or Join a League 🏟️",
        lines: [
          "The primary objective of the league is to post as many games as possible until the league ends.",
          'You can request to join an open league by visiting the league page and tapping "Request to Join".',
          "A league owner or admin can also invite players directly into their league and approve join requests.",
          "A league can have up to 64 players and last up to 3 months. Within this time, players can play matches and submit scores.",
        ],
      },
      {
        title: "Play Matches & Submit Scores 🏸",
        lines: [
          'After playing a match, submit the game result by pressing "Add Game" in the league scoreboard.',
          "Select your opponents, input scores and submit for approval.",
        ],
      },
      {
        title: "Approve Game Results ✅",
        lines: [
          "Your opponents will receive a notification to approve the scores to ensure fair play and accurate tracking of performance.",
          "Once approved by opponents, stats and rankings will update accordingly.",
          "If an opponent disputes the score, the game will be deleted and must be resubmitted once its resolved by the players.",
          "If no approval or dispute is made within 24 hours, the game will be auto-approved.",
        ],
      },
      {
        title: "Track Stats & Climb Ranks 📈",
        lines: [
          "View your personal stats and league rankings in real-time after every game is approved.",
          "Earn XP and medals through victories and achievements to climb the leaderboard.",
        ],
      },
      {
        title: "Prize XP Distribution 🏆",
        lines: [
          "Each league has its own prize pool which accumulates prize XP for every game played.",
          "The system considers the total number of games played, number of active players, and total winning points accumulated.",
          "The top 4 players with the most wins, followed by highest PD (points difference), will be crowned the league champions.",
          "Once the league ends, prizes are distributed to the top 4 players",
        ],
      },
    ],
  },
  {
    question: "How do ranks and medals work?",
    answer:
      "Your rank is based on XP. You gain XP for wins and lose it for losses. Special achievements grant medals and bonus XP, while significant losses have extra penalties.",
    sections: [
      {
        title: "Decisive Victory (Assassin Medal)",
        lines: [
          "Win by 10+ points: Earn the 'Assassin' medal and bonus XP.",
          "Lose by 10+ points: Incur an extra XP penalty.",
        ],
      },
      {
        title: "Win Streaks (Streak Medals)",
        lines: [
          "Win 3, 5, or 7 games in a row to earn a special medal for each milestone.",
        ],
      },
      {
        title: "Rank Difference",
        lines: [
          "Beat a higher-ranked player: Earn bonus XP.",
          "Lose to a lower-ranked player: Incur an extra XP penalty.",
        ],
      },
    ],
  },
  {
    question: "What stats do we track?",
    answer:
      "We track a variety of stats to help players understand their performance, including:",
    bullets: [
      "Match wins and losses",
      "Points scored and conceded",
      "Player rankings and XP progression",
      "Team performance and rival opponents",
    ],
  },
  {
    question: "How can I contact support?",
    answer:
      "You can contact support via the Support section in the app or email info@courtchamps.com",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes, we use industry-standard security measures to protect your data.",
  },
];

const FAQ = ({ navigation }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleExpand = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Container>
      <Header>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <HeaderTitle>Frequently Asked Questions</HeaderTitle>
        <View style={{ width: 24 }} />
      </Header>
      {faqs.map((faq, idx) => {
        const isExpanded = expandedIndex === idx;
        return (
          <FAQItem key={idx} onPress={() => toggleExpand(idx)}>
            <QuestionRow>
              <Question>{faq.question}</Question>
              <Chevron
                name="chevron-down"
                size={20}
                style={{
                  transform: [{ rotate: isExpanded ? "180deg" : "0deg" }],
                }}
              />
            </QuestionRow>
            {isExpanded && (
              <>
                <Answer>{faq.answer}</Answer>

                {faq.bullets &&
                  faq.bullets.map((bullet, i) => (
                    <BulletRow key={i}>
                      <BulletDot>{"\u2022"}</BulletDot>
                      <BulletText>{bullet}</BulletText>
                    </BulletRow>
                  ))}

                {faq.sections &&
                  faq.sections.map((section, i) => (
                    <SectionContainer key={i}>
                      <SectionTitleRow>
                        <SectionTitle>{section.title}</SectionTitle>
                        {section.title.includes("Assassin Medal") && (
                          <MedalImage source={gameMedals.demon_win} />
                        )}
                        {section.title.includes("Streak Medals") && (
                          <StreakMedalsRow>
                            <MedalImage source={gameMedals.win_streak_3} />
                            <MedalImage source={gameMedals.win_streak_5} />
                            <MedalImage source={gameMedals.win_streak_7} />
                          </StreakMedalsRow>
                        )}
                      </SectionTitleRow>
                      {section.lines.map((line, j) => (
                        <BulletRow key={j}>
                          <BulletDot>{"\u2022"}</BulletDot>
                          <BulletText>{line}</BulletText>
                        </BulletRow>
                      ))}
                    </SectionContainer>
                  ))}
              </>
            )}
          </FAQItem>
        );
      })}
    </Container>
  );
};

// --- Styled Components ---
const Container = styled.ScrollView({
  flex: 1,
  paddingHorizontal: 16,
  paddingTop: 24,
  backgroundColor: "rgb(3, 16, 31)",
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 30,
  justifyContent: "space-between",
});

const HeaderTitle = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});
const FAQItem = styled.TouchableOpacity({
  backgroundColor: "#00152B",
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.1)",
});

const QuestionRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});

const Question = styled.Text({
  fontSize: 16,
  fontWeight: "600",
  color: "#FFFFFF",
  flex: 1,
  marginRight: 12,
});

const Chevron = styled(Feather)({
  color: "rgba(255,255,255,0.7)",
});

const Answer = styled.Text({
  fontSize: 14,
  color: "rgba(255,255,255,0.8)",
  lineHeight: 20,
  marginTop: 12,
});

const SectionContainer = styled.View({
  marginTop: 16,
});

const SectionTitleRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 8,
  flexWrap: "wrap",
});

const SectionTitle = styled.Text({
  fontSize: 15,
  fontWeight: "600",
  color: "#FFFFFF",
});

const BulletRow = styled.View({
  flexDirection: "row",
  alignItems: "flex-start",
  marginTop: 8,
});

const BulletDot = styled.Text({
  color: "rgba(255,255,255,0.8)",
  fontSize: 14,
  marginRight: 8,
  lineHeight: 20,
});

const BulletText = styled.Text({
  color: "rgba(255,255,255,0.8)",
  fontSize: 14,
  lineHeight: 20,
  flex: 1,
});

const StreakMedalsRow = styled.View({
  flexDirection: "row",
  marginLeft: 8,
  alignItems: "center",
});

const MedalImage = styled(Image)({
  width: 25,
  height: 25,
  marginLeft: 6,
});

export default FAQ;
