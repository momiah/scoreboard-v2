export function generateLeagueId(leagueData) {

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const uniquePart = Array.from({ length: 5 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");


    return `${uniquePart}-${leagueData.startDate}-${leagueData.leagueName}`;
}