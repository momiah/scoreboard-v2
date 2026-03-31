import { NormalizedCompetition, UserProfile } from "@shared/types";

const today = new Date();
today.setHours(0, 0, 0, 0);

const parseEndDate = (dateStr: string | null) => {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const getLocalFirstCompetitions = ({
  competitions,
  checkEndDate = false,
  limit = 5,
  currentUser = null,
}: {
  competitions: NormalizedCompetition[];
  checkEndDate?: boolean;
  limit?: number;
  currentUser?: UserProfile | null;
}): NormalizedCompetition[] => {
  const active = competitions.filter((competition) => {
    if (competition?.privacy !== "Public") return false;
    if (checkEndDate) {
      const endDate = parseEndDate(competition?.endDate);
      if (endDate && endDate < today) return false;
    }
    if (!currentUser) return true;

    const userIsOwner = competition.owner?.userId === currentUser?.userId;
    const isParticipant = (competition.participants ?? []).some(
      (p) => p?.userId === currentUser?.userId,
    );
    return !userIsOwner && !isParticipant;
  });

  const local = active.filter(
    (c) => c.countryCode === currentUser?.location?.countryCode,
  );
  const global = active.filter(
    (c) => c.countryCode !== currentUser?.location?.countryCode,
  );

  return [...local, ...global].slice(0, limit);
};
