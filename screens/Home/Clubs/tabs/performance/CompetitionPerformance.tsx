import React, { useState, useEffect, useCallback } from "react";
import { FlatList, View, Dimensions } from "react-native";
import { collection, getDocs, query, where } from "firebase/firestore";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import LoadingOverlay from "../../../../../components/LoadingOverlay";
import { formatDisplayName } from "../../../../../helpers/formatDisplayName";
import { db } from "../../../../../services/firebase.config";

const { width: screenWidth } = Dimensions.get("window");

// ─── Trophy column config ─────────────────────────────────────────────────────

const TROPHIES = [
  { key: "first",  color: "#FFD700" },  // gold
  { key: "second", color: "#DC143C" },  // crimson
  { key: "third",  color: "#C0C0C0" },  // silver
  { key: "fourth", color: "#8B5E3C" },  // bronze
] as const;

type PlacementKey = (typeof TROPHIES)[number]["key"];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlacementRow {
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  first: number;
  second: number;
  third: number;
  fourth: number;
}

interface CompetitionPerformanceProps {
  clubId: string;
  type: "league" | "tournament";
  /** Pass mock rows to bypass Firestore fetch during development */
  mockData?: PlacementRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sort participants by wins → PD (same order as calculatePrizeAllocation) */
const sortByPerformance = (
  participants: { numberOfWins?: number; totalPointDifference?: number }[],
) =>
  [...participants].sort((a, b) => {
    const winDiff = (b.numberOfWins ?? 0) - (a.numberOfWins ?? 0);
    if (winDiff !== 0) return winDiff;
    return (b.totalPointDifference ?? 0) - (a.totalPointDifference ?? 0);
  });

// ─── Component ────────────────────────────────────────────────────────────────

const CompetitionPerformance: React.FC<CompetitionPerformanceProps> = ({
  clubId,
  type,
  mockData,
}) => {
  const [rows, setRows] = useState<PlacementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const compute = useCallback(async () => {
    if (mockData) {
      setRows(mockData);
      setLoading(false);
      return;
    }

    if (!clubId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const collectionName = type === "league" ? "leagues" : "tournaments";
      const participantsKey =
        type === "league" ? "leagueParticipants" : "tournamentParticipants";

      const snap = await getDocs(
        query(
          collection(db, collectionName),
          where("clubId", "==", clubId),
        ),
      );

      const totals = new Map<
        string,
        PlacementRow & { firstName?: string; lastName?: string; username?: string }
      >();

      snap.forEach((doc) => {
        const data = doc.data();
        const rawParticipants: {
          userId?: string;
          firstName?: string;
          lastName?: string;
          username?: string;
          numberOfWins?: number;
          totalPointDifference?: number;
        }[] = data[participantsKey] ?? data.participants ?? [];

        const sorted = sortByPerformance(rawParticipants);
        const finalists = sorted.slice(0, 4);
        const placementKeys: PlacementKey[] = [
          "first",
          "second",
          "third",
          "fourth",
        ];

        finalists.forEach((p, idx) => {
          if (!p.userId) return;
          const key = placementKeys[idx];
          const existing = totals.get(p.userId);
          if (!existing) {
            totals.set(p.userId, {
              userId: p.userId,
              firstName: p.firstName,
              lastName: p.lastName,
              username: p.username,
              first: 0,
              second: 0,
              third: 0,
              fourth: 0,
              [key]: 1,
            });
          } else {
            existing[key] += 1;
          }
        });
      });

      // Sort by 1st desc → 2nd desc → 3rd desc → 4th desc
      const sorted = Array.from(totals.values()).sort(
        (a, b) =>
          b.first - a.first ||
          b.second - a.second ||
          b.third - a.third ||
          b.fourth - a.fourth,
      );

      setRows(sorted);
    } catch (e) {
      console.error(`Club ${type} performance fetch error:`, e);
    } finally {
      setLoading(false);
    }
  }, [clubId, type, mockData]);

  useEffect(() => {
    compute();
  }, [compute]);

  const renderHeader = () => (
    <HeaderRow>
      <RankCell />
      <NameCell />
      {TROPHIES.map((t) => (
        <StatCell key={t.key}>
          <Ionicons name="trophy" size={22} color={t.color} />
        </StatCell>
      ))}
    </HeaderRow>
  );

  const renderRow = useCallback(
    ({ item, index }: { item: PlacementRow; index: number }) => {
      const name = formatDisplayName(item);
      const suffix =
        index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th";

      return (
        <DataRow>
          <RankCell>
            <RankText>
              {index + 1}
              {suffix}
            </RankText>
          </RankCell>
          <NameCell>
            <NameText numberOfLines={1}>{name}</NameText>
          </NameCell>
          {TROPHIES.map((t) => (
            <StatCell key={t.key}>
              <StatText>{item[t.key]}</StatText>
            </StatCell>
          ))}
        </DataRow>
      );
    },
    [],
  );

  if (loading) {
    return (
      <Container>
        <LoadingOverlay visible />
      </Container>
    );
  }

  if (rows.length === 0) {
    return (
      <Container>
        <EmptyText>
          {type === "league"
            ? "No completed leagues in this club yet."
            : "No completed tournaments in this club yet."}
        </EmptyText>
      </Container>
    );
  }

  return (
    <Container>
      {renderHeader()}
      <FlatList
        data={rows}
        renderItem={renderRow}
        keyExtractor={(r) => r.userId}
      />
    </Container>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const Container = styled.View({
  paddingTop: 20,
  flex: 1,
});

const HeaderRow = styled.View({
  flexDirection: "row",
  paddingBottom: 8,
  borderBottomWidth: 1,
  borderBottomColor: "rgb(9, 33, 62)",
  marginBottom: 4,
});

const DataRow = styled.View({
  flexDirection: "row",
  borderTopWidth: 1,
  borderTopColor: "rgb(9, 33, 62)",
});

const RankCell = styled.View({
  width: 42,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 14,
});

const NameCell = styled.View({
  flex: 2,
  justifyContent: "center",
  paddingVertical: 14,
  paddingRight: 6,
});

const StatCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 14,
});

const RankText = styled.Text({
  fontSize: 13,
  color: "#00A2FF",
  fontWeight: "bold",
});

const NameText = styled.Text({
  fontSize: screenWidth <= 400 ? 13 : 14,
  fontWeight: "bold",
  color: "white",
});

const StatText = styled.Text({
  fontSize: screenWidth <= 400 ? 16 : 18,
  fontWeight: "bold",
  color: "white",
});

const EmptyText = styled.Text({
  color: "#aaa",
  fontStyle: "italic",
  fontSize: 15,
  textAlign: "center",
  marginTop: 50,
  lineHeight: 22,
});

export default CompetitionPerformance;
