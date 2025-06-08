import gameMedals from "../../rankingMedals";
import styled from "styled-components/native";
import React, { useMemo } from "react";
import { Dimensions } from "react-native";
import { formatNumber } from "../../helpers/formatNumber";
import { useImageLoader } from "../../utils/imageLoader";
import {
  CircleSkeleton,
  TextSkeleton,
} from "../../components/Skeletons/UserProfileSkeleton";
import { SKELETON_THEMES } from "../../components/Skeletons/skeletonConfig";

const { width: screenWidth } = Dimensions.get("window");
const medalSize = screenWidth <= 400 ? 50 : 60;

const MatchMedals = ({
  demonWin = 0,
  winStreak3 = 0,
  winStreak5 = 0,
  winStreak7 = 0,
}) => {
  // Memoize medal data
  const medalsData = useMemo(
    () => [
      {
        medal: gameMedals.demon_win,
        title: "Assassin",
        stat: demonWin,
        key: "demon_win",
      },
      {
        medal: gameMedals.win_streak_3,
        title: "3 Win Streak",
        stat: winStreak3,
        key: "win_streak_3",
      },
      {
        medal: gameMedals.win_streak_5,
        title: "5 Win Streak",
        stat: winStreak5,
        key: "win_streak_5",
      },
      {
        medal: gameMedals.win_streak_7,
        title: "7 Win Streak",
        stat: winStreak7,
        key: "win_streak_7",
      },
    ],
    [demonWin, winStreak3, winStreak5, winStreak7]
  );

  // Individual medal component
  const MedalItem = React.memo(({ medal, title, stat, medalKey }) => {
    const { imageLoaded, handleImageLoad, handleImageError } = useImageLoader();

    return (
      <MedalContainer>
        <MedalImageContainer>
          <CircleSkeleton
            show={!imageLoaded}
            size={medalSize}
            config={SKELETON_THEMES.dark}
          >
            <Medal
              source={medal}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ opacity: imageLoaded ? 1 : 0 }}
            />
          </CircleSkeleton>
        </MedalImageContainer>

        <TextSkeleton
          show={!imageLoaded}
          height={12}
          width={60}
          config={SKELETON_THEMES.dark}
        >
          <MedalTitle style={{ opacity: imageLoaded ? 1 : 0 }}>
            {title}
          </MedalTitle>
        </TextSkeleton>

        <TextSkeleton
          show={!imageLoaded}
          height={16}
          width={40}
          config={SKELETON_THEMES.dark}
        >
          <MedalStat style={{ opacity: imageLoaded ? 1 : 0 }}>
            {formatNumber(stat)}
          </MedalStat>
        </TextSkeleton>
      </MedalContainer>
    );
  });

  return (
    <Container>
      {medalsData.map((medal) => (
        <MedalItem
          key={medal.key}
          medal={medal.medal}
          title={medal.title}
          stat={medal.stat}
          medalKey={medal.key}
        />
      ))}
    </Container>
  );
};

const Container = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  borderTopColor: "#262626",
  borderTopWidth: 1,
  width: "100%",
  paddingVertical: 20,
});

const MedalImageContainer = styled.View({
  width: medalSize,
  height: medalSize,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 10,
});

const Medal = styled.Image({
  width: medalSize,
  height: medalSize,
  resizeMode: "contain",
});

const MedalContainer = styled.View({
  flexDirection: "column",
  alignItems: "center",
  flex: 1,
  gap: 5,
});

const MedalTitle = styled.Text({
  color: "#aaa",
  fontSize: 10,
  textAlign: "center",
  marginBottom: 5,
});

const MedalStat = styled.Text({
  color: "white",
  fontWeight: "bold",
  textAlign: "center",
});

export default React.memo(MatchMedals, (prevProps, nextProps) => {
  return (
    prevProps.demonWin === nextProps.demonWin &&
    prevProps.winStreak3 === nextProps.winStreak3 &&
    prevProps.winStreak5 === nextProps.winStreak5 &&
    prevProps.winStreak7 === nextProps.winStreak7
  );
});
