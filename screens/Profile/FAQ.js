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
          "Earn CP and medals through victories and achievements to climb the leaderboard.",
        ],
      },
      {
        title: "Prize CP Distribution (Court Points) 🏆",
        lines: [
          "The goal of every player on Court Champs is to earn as much Court Points (CP) as possible to climb the global leaderboard.",
          "Each league has its own prize pool which accumulates prize CP for every game played.",
          "The system considers the total number of games played, number of active players, and total winning points accumulated.",
          "The top 4 players with the most wins, followed by highest PD (points difference), will be crowned the league champions.",
          "Once the league ends, prizes are distributed to the top 4 players",
        ],
      },
    ],
  },
  {
    question: "What is a League?",
    answer:
      "A league is an ongoing competition where players accumulate wins and stats over a set period (up to 3 months). It's ideal for regular badminton communities who want to track performance over time.",
    sections: [
      {
        title: "Format & Structure 🏟️",
        lines: [
          "Leagues support Singles and Doubles formats with up to 64 players.",
          "Players freely schedule and play matches against any opponent in the league at any time.",
          "Standings are determined by wins, followed by points difference (PD) as a tiebreaker.",
        ],
      },
      {
        title: "Scoring & Rankings 📊",
        lines: [
          "Every approved game updates the live scoreboard in real-time.",
          "Stats tracked include wins, losses, points difference, streaks, and more.",
          "The top 4 players at the end of the league share the CP prize pool.",
        ],
      },
      {
        title: "Bulk Publishing (Admins) 📋",
        lines: [
          "Admins can choose to allow players to publish their own games one by one or use the Bulk Publish feature to generate multiple matchups at once.",
          "League admins can publish multiple games at once using the Bulk Publish feature.",
          "Select any combination of players and generate all matchups in one go.",
          "Bulk published games are added to the scoreboard instantly, ready for players to submit scores.",
          "This is ideal for session nights where many games are played back to back.",
        ],
      },
      {
        title: "Joining a League 🤝",
        lines: [
          "Leagues can be public (open requests) or private (invite only).",
          "Request to join an open league from the league page, or accept a direct invite from a league admin.",
          "Admins can approve or decline join requests at any time.",
        ],
      },
    ],
  },
  {
    question: "What is a Tournament?",
    answer:
      "A tournament is a structured, fixture-based competition where players are matched in organised rounds. It's ideal for one-off events or competitive sessions with a defined winner.",
    sections: [
      {
        title: "Format & Fixtures 🏆",
        lines: [
          "Fixtures are automatically generated at the start of the tournament, scheduling every player or team against each other.",
          "Tournaments support Singles, Fixed Doubles, and Mixed Doubles formats.",
          "Games are played in rounds, with results tracked across all fixtures.",
        ],
      },
      {
        title: "Team Generation 🎲",
        lines: [
          "When generating doubles fixtures, admins choose between two team generation methods: Random or Balanced.",
          "Random generation pairs players together randomly — great for casual, unpredictable matchups.",
          "Balanced generation intelligently pairs the highest-ranked player with the lowest-ranked, working inward toward the middle — so 1st pairs with last, 2nd pairs with second-to-last, and so on until the middle pair (e.g. 7th with 8th in a 16-player tournament).",
          "Balanced generation ensures every team has a mix of strong and developing players, keeping games competitive and fair across all courts.",
        ],
      },
      {
        title: "Scoring & Progression 📈",
        lines: [
          "Results are submitted and approved the same way as leagues — opponents must approve scores for stats to count.",
          "Standings update in real-time after each approved game.",
          "The top 4 players by wins and points difference are crowned the tournament champions.",
        ],
      },
      {
        title: "Bulk Publishing (Admins) 📋",
        lines: [
          "Admins can choose to allow players to publish their own games one by one or use the Bulk Publish feature to generate multiple matchups at once.",
          "Tournament admins can bulk publish all fixture games for a round at once.",
          "Once fixtures are generated, admins select a round and publish all its games simultaneously.",
          "Players are notified and can begin submitting results straight away.",
          "This keeps the tournament moving efficiently without admins having to publish games one by one.",
        ],
      },
      {
        title: "Joining a Tournament 🤝",
        lines: [
          "Tournaments can be public or private, with the same invite and request system as leagues.",
          "Once the organiser generates fixtures, the tournament is locked and play begins.",
          "Paid tournaments with real cash prizes are coming soon via secure in-app payments.",
        ],
      },
    ],
  },
  {
    question: "How do ranks and medals work?",
    answer:
      "Your rank is based on CP. You gain CP for wins and lose it for losses. Special achievements grant medals and bonus CP, while significant losses have extra penalties.",
    sections: [
      {
        title: "Decisive Victory (Assassin Medal)",
        lines: [
          "Win by 10+ points: Earn the 'Assassin' medal and bonus CP.",
          "Lose by 10+ points: Incur an extra CP penalty.",
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
          "Beat a higher-ranked player: Earn bonus CP.",
          "Lose to a lower-ranked player: Incur an extra CP penalty.",
        ],
      },
    ],
  },
  {
    question: "What is the Quick Add Game modal?",
    answer:
      "The Quick Add Game modal (accessed via the blue ⨁ tab button below) lets players rapidly submit game results without navigating deep into their competition.",
    sections: [
      {
        title: "Quick Add for Leagues 🏟️",
        lines: [
          "Tap the Quick Add button from the home screen to instantly open your league's game submission form.",
          "Select your opponents, enter the score, and submit for approval in seconds.",
          "Ideal for session nights where multiple games are played back to back and you want to log results on the spot.",
          "If you're in multiple leagues, you can select which league you're submitting the game to.",
        ],
      },
      {
        title: "Quick Add for Tournaments 🏆",
        lines: [
          "For tournaments, the Quick Add modal automatically surfaces your next scheduled fixture so you never have to hunt for your upcoming game.",
          "Your next opponent, court number, and round are displayed upfront — just play and submit the result directly from the modal.",
          "Once submitted, the result is sent for opponent approval and your next fixture will appear ready for the following round.",
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
      "Player rankings and CP progression",
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
