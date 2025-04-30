export function generateCourtId(courtData) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const uniqueId = Array.from({ length: 5 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");

  const formattedCourtName = courtData.courtName.replace(/\s+/g, "-");
  const formattedCountryName = courtData.location.country.replace(/\s+/g, "-");
  const formattedCityName = courtData.location.city.replace(/\s+/g, "-");

  return `${formattedCourtName}-${formattedCityName}-${formattedCountryName}-${uniqueId}`;
}
