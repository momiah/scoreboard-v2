export const getSplitParagraphs = (body, splitAfter) => {
  if (!body) return [];

  // Split and trim individual sentences
  const sentences = body
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);
  const total = sentences.length;
  const groupSize = Math.ceil(total / splitAfter);

  const chunks = [];
  for (let i = 0; i < total; i += groupSize) {
    const groupSentences = sentences.slice(i, i + groupSize);
    let group = groupSentences.join(". ");
    if (!/[.!?]$/.test(group.trim())) {
      group += ".";
    }
    chunks.push(group);
  }

  return chunks;
};
