export const validateBadmintonScores = (score1, score2) => {
  const maxScore = Math.max(score1, score2);
  const minScore = Math.min(score1, score2);

  // Case 1: Scores equal
  if (score1 === score2) {
    return "Scores cannot be equal. Please enter different scores.";
  }

  // Case 2: Scores below 21
  if (maxScore < 21) {
    return "The winning score must be at least 21 points.";
  }

  // Case 3: Winning score is exactly 21
  if (maxScore === 21 && minScore > 19) {
    return "At 21 points, the opponent's score must be 19 or less.";
  }

  // Case 4: Scores between 22-29
  if (maxScore >= 22 && maxScore <= 29) {
    if (maxScore - minScore !== 2) {
      return "Scores above 21 and below 30, the difference must be 2 points.";
    }
  }

  // Case 5: Winning score is 30
  if (maxScore === 30 && minScore < 28) {
    return "At 30 points, the opponent's score must be 28 or 29.";
  }

  // Case 6: Scores exceed 30
  if (maxScore > 30) {
    return "Scores cannot exceed 30 points. Please enter valid scores.";
  }

  return null; // Valid scores
};
