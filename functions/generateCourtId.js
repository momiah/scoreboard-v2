export function generateCourtId(courtData) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const uniqueId = Array.from({ length: 5 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");

  const formattedCourtName = courtData.courtName.replace(/\s+/g, "-");

  return `${formattedCourtName}-${courtData.location.city}-${courtData.location.country}-${uniqueId}`;
}
