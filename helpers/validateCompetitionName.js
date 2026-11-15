// Competition IDs are built from the name (see generateLeagueId) and shared in
// invite links, where "?" and "#" would cut the link short.
const DISALLOWED_CHARACTERS = /[?#]/;

export const validateCompetitionName = (name) => {
  if (name && DISALLOWED_CHARACTERS.test(name)) {
    return "Name can't contain ? or #";
  }
  return null;
};
