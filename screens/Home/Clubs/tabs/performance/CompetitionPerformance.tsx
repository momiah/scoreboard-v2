import React, { useState, useEffect, useCallback } from "react";
import { FlatList, Image, Dimensions } from "react-native";
import { collection, getDocs, query, where } from "firebase/firestore";
import styled from "styled-components/native";

import LoadingOverlay from "../../../../../components/LoadingOverlay";
import { formatDisplayName } from "../../../../../helpers/formatDisplayName";
import { db } from "../../../../../services/firebase.config";
import { COLLECTION_NAMES } from "@shared";
import { trophies, medals } from "../../../../../mockImages/index";

const { width: screenWidth } = Dimensions.get("window");

const PLACEMENT_KEYS = ["first", "second", "third", "fourth"] as const;
type PlacementKey = (typeof PLACEMENT_KEYS)[number];

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

interface RawCompParticipant {
  userId?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  numberOfWins?: number;
  totalPointDifference?: number;
}

const sortByPerformance = (participants: RawCompParticipant[]) =>
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

  // Pick trophy images based on competition type
  const icons = type === "league" ? trophies : medals;

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
      const collectionName =
        type === "league"
          ? COLLECTION_NAMES.leagues
          : COLLECTION_NAMES.tournaments;
      const participantsKey =
        type === "league" ? "leagueParticipants" : "tournamentParticipants";

      // Fetch all club members + all club competitions in parallel
      const [membersSnap, competitionsSnap] = await Promise.all([
        getDocs(
          collection(db, COLLECTION_NAMES.clubs, clubId, "participants"),
        ),
        getDocs(
          query(collection(db, collectionName), where("clubId", "==", clubId)),
        ),
      ]);

      // Seed every club member with zero placements
      const totals = new Map<string, PlacementRow>();
      membersSnap.forEach((doc) => {
        const m = doc.data();
        if (!m.userId) return;
        totals.set(m.userId, {
          userId: m.userId,
          firstName: m.firstName,
          lastName: m.lastName,
          username: m.username,
          first: 0,
          second: 0,
          third: 0,
          fourth: 0,
        });
      });

      // Tally placements from each competition
      competitionsSnap.forEach((doc) => {
        const data = doc.data();
        const rawParticipants: RawCompParticipant[] =
          data[participantsKey] ?? data.participants ?? [];

        const sorted = sortByPerformance(rawParticipants);
        sorted.slice(0, 4).forEach((p, idx) => {
          if (!p.userId) return;
          const key = PLACEMENT_KEYS[idx];
          const existing = totals.get(p.userId);
          if (!existing) {
            // Member in competition but not yet in participants subcollection
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

      // Sort: 1st desc → 2nd → 3rd → 4th
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
      {PLACEMENT_KEYS.map((key, idx) => (
        <StatCell key={key}>
          <Image
            source={icons[idx]}
            style={{
              width: type === "league" ? 40 : 32,
              height: 40,
              resizeMode: "contain",
            }}
          />
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
          {PLACEMENT_KEYS.map((key) => (
            <StatCell key={key}>
              <StatText>{item[key]}</StatText>
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
            ? "No leagues in this club yet."
            : "No tournaments in this club yet."}
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
  paddingTop: 0,
  flex: 1,
});

const HeaderRow = styled.View({
  flexDirection: "row",
  paddingBottom: 2,
  borderBottomWidth: 1,
  borderBottomColor: "rgb(9, 33, 62)",
  marginBottom: 0,
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
