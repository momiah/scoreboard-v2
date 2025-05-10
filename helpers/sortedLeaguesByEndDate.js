export const sortLeaguesByEndDate = (leagues) => {
  // Helper to parse a "DD-MM-YYYY" string into a Date object
  const parseEndDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    const [day, month, year] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  return leagues.sort((a, b) => {
    const dateA = parseEndDate(a.endDate);
    const dateB = parseEndDate(b.endDate);
    // Newest league (later endDate) should come first
    return dateB - dateA;
  });
};
