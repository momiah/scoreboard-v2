// components/Skeletons/AllPlayerSkeleton.js
import React from "react";
import { Skeleton } from "moti/skeleton";
import styled from "styled-components/native";

// Default styled components
const DefaultPlayerRow = styled.TouchableOpacity({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  borderTopWidth: 1,
  borderColor: "1px solid rgb(9, 33, 62)",
  borderRadius: 10,
});

const DefaultTableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const DefaultPlayerNameCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 15,
  paddingBottom: 15,
  width: 110,
});

const AllPlayerSkeleton = ({
  iconSize = 40, // Default parameter
  PlayerRow = DefaultPlayerRow, // Default component
  TableCell = DefaultTableCell, // Default component
  PlayerNameCell = DefaultPlayerNameCell, // Default component
}) => {
  return (
    <PlayerRow>
      {/* Left profile pic skeleton */}
      <Skeleton
        radius="round"
        width={iconSize}
        height={iconSize}
        colorMode="dark"
        backgroundColor="#1a2f4b"
      />

      {/* Rank skeleton */}
      <TableCell>
        <Skeleton width={30} height={20} colorMode="dark" />
      </TableCell>

      {/* Name skeleton */}
      <PlayerNameCell>
        <Skeleton width={100} height={20} colorMode="dark" />
      </PlayerNameCell>

      {/* Country skeleton */}
      <TableCell>
        <Skeleton width={20} height={20} colorMode="dark" />
      </TableCell>

      {/* Wins skeleton */}
      <TableCell>
        <Skeleton width={30} height={20} colorMode="dark" />
      </TableCell>

      {/* Right rank image skeleton */}
      <TableCell>
        <Skeleton
          radius="round"
          width={iconSize}
          height={iconSize}
          colorMode="dark"
          backgroundColor="#1a2f4b"
        />
      </TableCell>
    </PlayerRow>
  );
};

export default AllPlayerSkeleton;
