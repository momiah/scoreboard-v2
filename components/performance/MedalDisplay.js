// MedalDisplay.js
import React, { useContext } from "react";
import { Image } from "react-native";
import { GameContext } from "../../context/GameContext";
import { useImageLoader } from "../../utils/imageLoader";
import { CircleSkeleton } from "../Skeletons/UserProfileSkeleton";
import { SKELETON_THEMES } from "../Skeletons/skeletonConfig";

const MedalDisplay = ({ xp, size }) => {
  const { getRankByXP } = useContext(GameContext);
  const { imageLoaded, handleImageLoad, handleImageError } = useImageLoader();
  const rank = getRankByXP(xp);

  return (
    <CircleSkeleton
      show={!imageLoaded}
      size={size}
      config={SKELETON_THEMES.dark}
    >
      <Image
        source={rank.icon}
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ width: size, height: size, resizeMode: "contain" }}
      />
    </CircleSkeleton>
  );
};

// Move memo() to the export
export default React.memo(MedalDisplay);
