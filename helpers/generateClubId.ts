export function generateClubId(name: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const uniqueId = Array.from({ length: 5 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
  const formattedName = name.replace(/\s+/g, "-");
  const dateStamp = new Date().toISOString().split("T")[0];
  return `${formattedName}-${dateStamp}-${uniqueId}`;
}
