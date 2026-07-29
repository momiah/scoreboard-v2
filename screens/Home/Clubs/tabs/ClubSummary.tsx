import React, { useContext, useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import styled from "styled-components/native";
// ParticipantCarousel is shared with CompetitionSummary — it renders the member
// avatars row plus Owner/Admin labels, so clubs get the same treatment.
import ParticipantCarousel from "../../../../components/Summary/ParticipantCarousel";
import { LeagueContext } from "../../../../context/LeagueContext";
import {
  getClubSummaryStats,
  ClubSummaryStats,
} from "../../../../helpers/clubPlayerStats";
import type { Club, Player } from "@shared/types";

interface ClubSummaryProps {
  clubId: string;
  club: Club | null;
}

/** createdAt may arrive as a Firestore Timestamp, a Date, or a serialized value. */
const formatFounded = (createdAt: unknown): string => {
  if (!createdAt) return "—";
  const raw = createdAt as { toDate?: () => Date; seconds?: number };
  let date: Date;
  if (typeof raw.toDate === "function") date = raw.toDate();
  else if (typeof raw.seconds === "number") date = new Date(raw.seconds * 1000);
  else date = new Date(createdAt as string | number | Date);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });
};

const ClubSummary: React.FC<ClubSummaryProps> = ({ clubId, club }) => {
  const { fetchClubParticipants } = useContext(LeagueContext);

  const [participants, setParticipants] = useState<Player[]>([]);
  const [stats, setStats] = useState<ClubSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [members, summary] = await Promise.all([
          fetchClubParticipants(clubId),
          getClubSummaryStats({ clubId }),
        ]);
        if (cancelled) return;
        setParticipants(members);
        setStats(summary);
      } catch (error) {
        console.error("Club summary load error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clubId, fetchClubParticipants]);

  if (loading) {
    return (
      <LoadingContainer>
        <ActivityIndicator size="large" color="#00A2FF" />
      </LoadingContainer>
    );
  }

  const topPlayer = stats?.topPlayer?.username ?? "—";
  const topTeam = stats?.topTeam?.team?.length
    ? stats.topTeam.team.join(" & ")
    : "—";
  const totalGames = stats?.totalGamesPlayed ?? 0;
  const founded = formatFounded(club?.createdAt);

  return (
    <Container showsVerticalScrollIndicator={false}>
      {/* Headline club-level metrics */}
      <MetricsGrid>
        <MetricCard>
          <MetricLabel>Founded</MetricLabel>
          <MetricValue>{founded}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>Games Played</MetricLabel>
          <MetricValue>{totalGames}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>Top Player</MetricLabel>
          <MetricValue numberOfLines={1}>{topPlayer}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>Top Team</MetricLabel>
          <MetricValue numberOfLines={1}>{topTeam}</MetricValue>
        </MetricCard>
      </MetricsGrid>

      {/* Members */}
      <ParticipantCarousel
        participants={participants}
        admins={club?.clubAdmins ?? []}
        owner={club?.clubOwner ?? {}}
      />

      {/* Description */}
      <Section>
        <SectionTitle>Description</SectionTitle>
        {club?.clubDescription ? (
          <DescriptionText>{club.clubDescription}</DescriptionText>
        ) : (
          <DisabledText>No description available</DisabledText>
        )}
      </Section>
    </Container>
  );
};

export default ClubSummary;

// --- Styled ---
const Container = styled.ScrollView({
  flex: 1,
  padding: 20,
});

const LoadingContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 40,
});

const MetricsGrid = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  marginBottom: 20,
});

const MetricCard = styled.View({
  width: "48%",
  backgroundColor: "rgba(255, 255, 255, 0.06)",
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
});

const MetricLabel = styled.Text({
  color: "#8b95a5",
  fontSize: 12,
  marginBottom: 6,
});

const MetricValue = styled.Text({
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const Section = styled.View({
  marginBottom: 20,
});

const SectionTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "#ffffff",
  marginBottom: 10,
});

const DescriptionText = styled.Text({
  color: "#cccccc",
  fontSize: 14,
  lineHeight: 20,
});

const DisabledText = styled.Text({
  color: "#888",
  fontSize: 14,
});
