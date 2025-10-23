export function generateLeagueId(name, startDate) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const uniqueId = Array.from({ length: 5 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");

  const formattedLeagueName = name.replace(/\s+/g, "-");

  return `${formattedLeagueName}-${startDate}-${uniqueId}`;
}
