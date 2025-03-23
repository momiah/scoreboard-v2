export function generateLeagueId(leagueData) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const uniqueId = Array.from({ length: 5 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");

  const formattedLeagueName = leagueData.leagueName.replace(/\s+/g, "-");

  return `${formattedLeagueName}-${leagueData.startDate}-${uniqueId}`;
}
