export function formatDisplayName(player) {
  const first = (player.firstName || "").trim().split(/\s+/)[0];
  const last = (player.lastName || "").trim().split(/\s+/)[0];

  const capFirst = first
    ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
    : "";

  const lastInitial = last ? last.charAt(0).toUpperCase() : "";

  return [capFirst, lastInitial].filter(Boolean).join(" ");
}
