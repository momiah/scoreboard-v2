import React, { useContext, useCallback } from "react";
import styled from "styled-components/native";
import MedalDisplay from "../../components/performance/MedalDisplay";
import CourtChampsLogo from "../../assets/court-champ-logo-icon.png";
import { GameContext } from "../../context/GameContext";
import { UserContext } from "../../context/UserContext";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-ico-flags";
import { CircleSkeleton } from "../../components/Skeletons/SkeletonComponents";
import { useImageLoader } from "../../utils/imageLoader";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import PaginatedList from "../../components/PaginatedList";

const iconSize = 40;

const getRankSuffix = (rank) => {
  const lastTwo = rank % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return "th";
  switch (rank % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const AllPlayers = () => {
  const { findRankIndex } = useContext(GameContext);
  const { getAllUsersPaginated } = useContext(UserContext);
  const navigation = useNavigation();
  const { imageLoaded, handleImageLoad, handleImageError } = useImageLoader();

  const fetchPage = useCallback(
    async (page, pageSize, search) => {
      const { users, totalUsers, totalPages } = await getAllUsersPaginated(
        page,
        pageSize,
        search,
      );
      return { items: users, totalItems: totalUsers, totalPages };
    },
    [getAllUsersPaginated],
  );

  const renderPlayer = useCallback(
    ({ item: player }) => {
      const playerXp = player.profileDetail.XP;
      const rankLevel = findRankIndex(playerXp) + 1;
      const displayName = formatDisplayName(player);

      return (
        <PlayerRow
          key={player.userId}
          onPress={() => {
            navigation.navigate("UserProfile", { userId: player.userId });
          }}
        >
          <CircleSkeleton show={!imageLoaded} size={iconSize}>
            <Avatar
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ opacity: imageLoaded ? 1 : 0 }}
              source={
                player?.profileImage
                  ? { uri: player.profileImage }
                  : CourtChampsLogo
              }
            />
          </CircleSkeleton>
          <TableCell>
            <Rank>
              {player.globalRank}
              <Suffix>{getRankSuffix(player.globalRank)}</Suffix>
            </Rank>
          </TableCell>
          <PlayerNameCell>
            <PlayerName>{displayName}</PlayerName>
          </PlayerNameCell>
          <TableCell>
            <Icon name={player.location.countryCode} height="20" width="20" />
          </TableCell>
          <TableCell>
            <StatTitle>CP</StatTitle>
            <Stat>{playerXp.toFixed(0)}</Stat>
          </TableCell>
          <TableCell>
            <MedalDisplay xp={playerXp.toFixed(0)} size={iconSize} />
            <RankLevel>{rankLevel}</RankLevel>
          </TableCell>
        </PlayerRow>
      );
    },
    [findRankIndex, navigation, imageLoaded, handleImageLoad, handleImageError],
  );

  return (
    <TableContainer>
      <PaginatedList
        fetchPage={fetchPage}
        renderItem={renderPlayer}
        keyExtractor={(player) => `${player.userId}-${player.globalRank}`}
        searchPlaceholder="Search players..."
        countLabel={(total) => `${total} players`}
        emptyText="No players found"
      />
    </TableContainer>
  );
};

const TableContainer = styled.View({
  paddingTop: 20,
  flex: 1,
  backgroundColor: " rgb(3, 16, 31)",
});

const Suffix = styled.Text({
  fontSize: 10,
  color: "#00A2FF",
});

const PlayerRow = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  borderTopWidth: 1,
  borderColor: "1px solid rgb(9, 33, 62)",
  borderRadius: 10,
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const PlayerNameCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 15,
  paddingBottom: 15,
  width: 110,
});

const Avatar = styled.Image({
  width: iconSize,
  height: iconSize,
  borderRadius: 30,
  borderWidth: 1,
  borderColor: "#00A2FF",
  marginBottom: 5,
});

const PlayerName = styled.Text({
  fontSize: 13,
  fontWeight: "bold",
  color: "white",
});

const Rank = styled.Text({
  fontSize: 13,
  color: "#00A2FF",
  fontWeight: "bold",
});

const StatTitle = styled.Text({
  fontSize: 11,
  color: "#aaa",
});

const Stat = styled.Text({
  fontSize: 12,
  fontWeight: "bold",
  color: "white",
});

const RankLevel = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
  color: "white",
});

export default AllPlayers;
